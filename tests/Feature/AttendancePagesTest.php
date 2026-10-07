<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\HR\AttendanceLog;
use App\Models\HR\Employee;
use App\Models\HR\LeaveRequest;
use App\Models\HR\Shift;
use App\Models\Role;
use App\Models\User;
use App\Services\Attendance\AttendancePeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Tests\TestCase;

/**
 * Ирцийн хуудсууд: өдрөөр (салбараар бүлэглэсэн), бүх ажилтны нэгтгэл тайлан,
 * ажилтны тайлан — 15 хоног / сар / улирал / хагас жил / жил.
 */
class AttendancePagesTest extends TestCase
{
    use RefreshDatabase;

    private Branch $sansar;

    private Branch $khoroolol;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-07 11:00:00');
        $this->withoutVite();
        $this->sansar = Branch::create(['name' => 'Сансар']);
        $this->khoroolol = Branch::create(['name' => 'Хороолол']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function hr(): User
    {
        return User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'admin'])->id]);
    }

    private function employee(string $firstName, Branch $branch): Employee
    {
        return Employee::create(['last_name' => 'Бат', 'first_name' => $firstName, 'branch_id' => $branch->id, 'salary' => 1, 'status' => 'active']);
    }

    private function shift(Employee $e, string $date, ?string $start, ?string $end, ?Branch $branch = null, string $kind = 'work'): void
    {
        Shift::create([
            'employee_id' => $e->id, 'branch_id' => ($branch ?? $this->sansar)->id, 'date' => $date, 'kind' => $kind,
            'start_time' => $start, 'end_time' => $end, 'status' => Shift::STATUS_PUBLISHED, 'published_at' => now(),
        ]);
    }

    private function log(Employee $e, string $date, string $in, ?string $out = null): void
    {
        AttendanceLog::create(['employee_id' => $e->id, 'date' => $date,
            'checked_in_at' => "{$date} {$in}", 'checked_out_at' => $out ? "{$date} {$out}" : null]);
    }

    public function test_period_ranges(): void
    {
        $range = fn (string $type, string $date) => [AttendancePeriod::make($type, $date)->from->toDateString(), AttendancePeriod::make($type, $date)->to->toDateString()];

        $this->assertSame(['2026-10-01', '2026-10-15'], $range('half_month', '2026-10-15'));
        $this->assertSame(['2026-02-16', '2026-02-28'], $range('half_month', '2026-02-16'));
        $this->assertSame(['2026-07-01', '2026-09-30'], $range('quarter', '2026-08-31'));
        $this->assertSame(['2026-01-01', '2026-06-30'], $range('half_year', '2026-03-31'), '31-нээс 6-р сар руу шилжихэд хэтрэхгүй');
        $this->assertSame(['2026-07-01', '2026-12-31'], $range('half_year', '2026-08-31'));

        $half = AttendancePeriod::make('half_month', '2026-10-03');
        $this->assertSame('2026-09-16', $half->previous()->from->toDateString());
        $this->assertNull($half->toArray()['next'], 'Одоогийн үеэс цааш ирээдүй рүү шилжихгүй');
        $this->assertSame('2026-10-01', AttendancePeriod::make('half_month', '2026-09-20')->toArray()['next']);

        // Буруу оролт → өнөөдрийг агуулсан сар
        $this->assertSame(['2026-10-01', '2026-10-31'], $range('weekly', '2026-02-31'));
        $this->assertCount(3, AttendancePeriod::make('quarter', '2026-10-07')->months());
    }

    public function test_day_view_groups_everyone_expected_that_day_by_branch(): void
    {
        $anu = $this->employee('Ану', $this->sansar);
        $bold = $this->employee('Болд', $this->sansar);
        $sara = $this->employee('Сараа', $this->khoroolol);
        $tuya = $this->employee('Туяа', $this->sansar);
        $zaya = $this->employee('Заяа', $this->sansar);

        $this->shift($anu, '2026-10-07', '08:30', '16:30');
        $this->log($anu, '2026-10-07', '08:40:00');
        $this->shift($bold, '2026-10-07', '12:30', '20:30');
        $this->shift($sara, '2026-10-07', '08:30', '16:30', $this->khoroolol);
        $this->shift($tuya, '2026-10-07', null, null, kind: 'off');
        LeaveRequest::create(['employee_id' => $zaya->id, 'start_date' => '2026-10-07', 'end_date' => '2026-10-07',
            'leave_type' => 'sick', 'status' => 'approved']);
        // Өчигдөр Хороололд орлон ажилласан
        $this->shift($anu, '2026-10-06', '08:30', '16:30', $this->khoroolol);
        $this->log($anu, '2026-10-06', '08:20:00', '16:40:00');

        $hr = $this->hr();
        $props = $this->actingAs($hr)->get('/hr/attendance')->assertOk()->viewData('page')['props'];
        $this->assertSame('day', $props['view']);
        $this->assertSame('2026-10-07', $props['date']);

        // Ирсэн → ирээгүй → ээлж эхлээгүй → чөлөөтэй → амралт
        $rows = collect($props['logs'])->keyBy('employee_name');
        $this->assertSame(
            ['Б.Ану' => 'late', 'Б.Сараа' => 'missing', 'Б.Болд' => 'upcoming', 'Б.Заяа' => 'leave', 'Б.Туяа' => 'off'],
            $rows->map(fn ($r) => $r['status'])->all(),
        );
        $this->assertSame($this->khoroolol->id, $rows['Б.Сараа']['branch_id']);
        $this->assertSame($this->sansar->id, $rows['Б.Ану']['branch_id']);

        // Долоо хоногийн тойм — Даваа гарагаас
        $this->assertSame('2026-10-05', $props['week'][0]['date']);
        $this->assertSame([['b' => $this->khoroolol->id, 's' => 'on_time', 'in' => true]], $props['week'][1]['rows']);

        $yesterday = collect($this->actingAs($hr)->get('/hr/attendance?date=2026-10-06')->viewData('page')['props']['logs'])->sole();
        $this->assertSame($this->khoroolol->id, $yesterday['branch_id']);
        $this->assertSame('Сансар', $yesterday['home_branch']);

        // Ирээдүйн огноо → өнөөдөр
        $this->assertSame('2026-10-07', $this->actingAs($hr)->get('/hr/attendance?date=2026-12-01')->viewData('page')['props']['date']);
    }

    public function test_report_view_summarizes_all_employees_for_a_period(): void
    {
        $anu = $this->employee('Ану', $this->sansar);
        $sara = $this->employee('Сараа', $this->khoroolol);
        $this->shift($anu, '2026-10-02', '08:30', '16:30');
        $this->log($anu, '2026-10-02', '08:20:00', '16:30:00');
        $this->shift($anu, '2026-10-05', '08:30', '16:30');
        $this->log($anu, '2026-10-05', '08:50:00', '16:30:00');
        $this->shift($sara, '2026-10-05', '08:30', '16:30', $this->khoroolol);

        $props = $this->actingAs($this->hr())->get('/hr/attendance?view=report&period=half_month&date=2026-10-03')
            ->assertOk()->viewData('page')['props'];

        $this->assertSame('report', $props['view']);
        $this->assertSame('2026 оны 10-р сарын 1–15', $props['period']['label']);
        $this->assertArrayNotHasKey('logs', $props, 'Нэгтгэлд өдрийн мөр илгээхгүй');

        $summary = collect($props['summary'])->keyBy('employee_name');
        $this->assertSame($this->sansar->id, $summary['Б.Ану']['branch_id']);
        $this->assertSame('Сансар', $summary['Б.Ану']['branch_name']);
        $this->assertSame(1, $summary['Б.Ану']['on_time_days']);
        $this->assertSame(1, $summary['Б.Ану']['late_count']);
        $this->assertSame(1, $summary['Б.Сараа']['absent_days']);
    }

    public function test_employee_report_breaks_long_periods_down_by_month(): void
    {
        $anu = $this->employee('Ану', $this->sansar);
        $this->shift($anu, '2026-08-03', '08:30', '16:30');
        $this->shift($anu, '2026-10-05', '08:30', '16:30');
        $this->log($anu, '2026-10-05', '08:31:00', '17:00:00');
        $this->shift($anu, '2026-10-06', null, null, kind: 'off');

        $hr = $this->hr();
        $props = $this->actingAs($hr)->get("/hr/attendance/employees/{$anu->id}?period=quarter&date=2026-08-15")
            ->assertOk()->viewData('page')['props'];

        $this->assertSame('2026 оны 3-р улирал', $props['period']['label']);
        $this->assertSame(['2026-07-01', '2026-08-01', '2026-09-01'], array_column($props['months'], 'from'));
        $this->assertNull($props['months'][0]['summary']);
        $this->assertSame(1, $props['months'][1]['summary']['absent_days']);

        $month = $this->actingAs($hr)->get("/hr/attendance/employees/{$anu->id}?period=month")->viewData('page')['props'];
        $this->assertSame([], $month['months'], 'Нэг сарын тайланд сарын задаргаа хэрэггүй');
        $this->assertSame(1, $month['summary']['on_time_days']);
        $this->assertSame(['2026-10-06' => 'off', '2026-10-05' => 'on_time'],
            collect($month['logs'])->mapWithKeys(fn ($r) => [$r['date'] => $r['status']])->all());
    }

    public function test_excel_follows_the_selected_period(): void
    {
        Excel::fake();
        $anu = $this->employee('Ану', $this->sansar);
        $hr = $this->hr();

        $this->actingAs($hr)->get('/hr/attendance/export-excel?period=half_month&date=2026-10-07')->assertOk();
        Excel::assertDownloaded('Ирцийн бүртгэл 2026 оны 10-р сарын 1–15.xlsx');

        $this->actingAs($hr)->get("/hr/attendance/export-excel?period=year&employee_id={$anu->id}")->assertOk();
        Excel::assertDownloaded('Ирцийн бүртгэл - Бат Ану 2026 он.xlsx');

        $this->actingAs($hr)->get('/hr/attendance/export-excel?view=day&date=2026-10-06')->assertOk();
        Excel::assertDownloaded('Ирцийн бүртгэл 2026-10-06.xlsx');
    }
}
