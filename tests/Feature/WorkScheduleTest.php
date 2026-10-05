<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\HR\AttendanceLog;
use App\Models\HR\Employee;
use App\Models\HR\LeaveRequest;
use App\Models\HR\Position;
use App\Models\HR\ScheduleAvailability;
use App\Models\HR\SchedulePattern;
use App\Models\HR\Shift;
use App\Models\HR\ShiftSwapRequest;
use App\Models\HR\ShiftTemplate;
use App\Models\Role;
use App\Models\User;
use App\Notifications\SchedulePublished;
use App\Notifications\ShiftSwapNotice;
use App\Services\Attendance\AttendanceReport;
use App\Services\Schedule\RosterLookup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Нэгдсэн хуваарь: ноорог → нийтлэх, нэг өдөр хоёр салбар, хэв маяг, хуулах,
 * менежерийн эрхийн хүрээ, ээлж солих, ирцийг хуваарьтай харьцуулах.
 */
class WorkScheduleTest extends TestCase
{
    use RefreshDatabase;

    private Branch $sansar;

    private Branch $khoroolol;

    private Position $doctorPos;

    private Position $receptionPos;

    private ShiftTemplate $morning;

    private ShiftTemplate $evening;

    private ShiftTemplate $doctorMorning;

    private ShiftTemplate $off;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-05 10:00:00'); // Даваа
        $this->sansar = Branch::create(['name' => 'Сансар']);
        $this->khoroolol = Branch::create(['name' => 'Хороолол']);
        $this->doctorPos = Position::create(['name' => 'Эмч', 'portal' => 'doctor']);
        $this->receptionPos = Position::create(['name' => 'Ресепшн', 'portal' => 'reception']);

        // Migration-ийн анхны загварууд (позицгүй үед эмчийн загвар үүсдэггүй)
        $this->morning = ShiftTemplate::where('code', 'Ө')->whereNull('position_ids')->firstOrFail();
        $this->evening = ShiftTemplate::where('code', 'О')->whereNull('position_ids')->firstOrFail();
        $this->off = ShiftTemplate::where('code', 'А')->firstOrFail();
        $this->doctorMorning = ShiftTemplate::create([
            'name' => 'Өглөө', 'code' => 'Ө', 'kind' => 'work', 'start_time' => '09:00', 'end_time' => '15:00',
            'color' => '#0284c7', 'position_ids' => [$this->doctorPos->id],
        ]);
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

    private function employee(string $name, ?Position $position = null, ?Branch $branch = null, ?User $user = null): Employee
    {
        return Employee::create([
            'user_id' => $user?->id,
            'last_name' => 'Бат', 'first_name' => $name,
            'branch_id' => ($branch ?? $this->sansar)->id,
            'position_id' => ($position ?? $this->receptionPos)->id,
            'salary' => 1000000, 'status' => 'active',
        ]);
    }

    private function setDays(User $as, array $days, string $url = '/hr/schedule/days', array $params = [])
    {
        return $this->actingAs($as)->postJson($url, ['days' => $days, 'branch' => $this->sansar->id, 'view' => 'week', 'date' => '2026-10-05'] + $params);
    }

    public function test_draft_is_invisible_until_published_and_publish_notifies_employee(): void
    {
        Notification::fake();
        $hr = $this->hr();
        $user = User::factory()->create();
        $anu = $this->employee('Ану', user: $user);

        $res = $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->morning->id]]]])
            ->assertOk();

        $this->assertSame('new', $res->json('board.shifts.0.state'));
        $this->assertSame('08:30', $res->json('board.shifts.0.start_time'));
        $this->assertSame(1, $res->json('board.draft_count'));
        $this->assertNull(RosterLookup::forDay($anu->id, '2026-10-06'), 'Ноорог ажилтан/ирцэд харагдах ёсгүй');

        $res = $this->actingAs($hr)->postJson('/hr/schedule/publish', ['branch' => $this->sansar->id, 'view' => 'week', 'date' => '2026-10-05'])
            ->assertOk();

        $this->assertSame(0, $res->json('board.draft_count'));
        $plan = RosterLookup::forDay($anu->id, '2026-10-06');
        $this->assertSame('08:30', $plan['start']);
        $this->assertSame(480, $plan['minutes']);
        Notification::assertSentTo($user, SchedulePublished::class);
    }

    public function test_editing_published_shift_keeps_id_and_removal_waits_for_publish(): void
    {
        Notification::fake();
        $hr = $this->hr();
        $anu = $this->employee('Ану');
        $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->morning->id]]]]);
        $this->actingAs($hr)->postJson('/hr/schedule/publish', ['branch' => $this->sansar->id, 'date' => '2026-10-05']);
        $published = Shift::published()->sole();

        // Засвар → "changed" ноорог, нийтлэгдсэн мөр хөндөгдөхгүй
        $res = $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->evening->id]]]]);
        $this->assertSame('changed', $res->json('board.shifts.0.state'));
        $this->assertStringStartsWith('Ө 08:30–16:30', $res->json('board.shifts.0.was'));
        $this->assertSame('08:30', RosterLookup::forDay($anu->id, '2026-10-06')['start']);

        // Нийтлэгдсэн хувилбартаа буцаавал ноорог арилна
        $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->morning->id]]]]);
        $this->assertSame(0, Shift::drafts()->count());

        $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->evening->id]]]]);
        $this->actingAs($hr)->postJson('/hr/schedule/publish', ['branch' => $this->sansar->id, 'date' => '2026-10-05']);
        $this->assertSame($published->id, Shift::published()->sole()->id, 'Нийтлэгдсэн мөрийн id тогтвортой');
        $this->assertSame('12:30', RosterLookup::forDay($anu->id, '2026-10-06')['start']);

        // Устгах → нийтлэх хүртэл хэвээр
        $res = $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-06', 'shifts' => []]]);
        $this->assertSame('removed', $res->json('board.shifts.0.state'));
        $this->assertNotNull(RosterLookup::forDay($anu->id, '2026-10-06'));

        $this->actingAs($hr)->postJson('/hr/schedule/discard', ['branch' => $this->sansar->id, 'date' => '2026-10-05'])->assertOk();
        $this->assertSame(1, Shift::count());

        $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-06', 'shifts' => []]]);
        $this->actingAs($hr)->postJson('/hr/schedule/publish', ['branch' => $this->sansar->id, 'date' => '2026-10-05']);
        $this->assertSame(0, Shift::count());
    }

    public function test_general_code_resolves_to_doctor_template_and_two_branches_in_one_day(): void
    {
        $hr = $this->hr();
        $doctor = $this->employee('Сараа', $this->doctorPos);

        $res = $this->setDays($hr, [['employee_id' => $doctor->id, 'date' => '2026-10-06', 'shifts' => [
            ['template_id' => $this->morning->id],
            ['template_id' => $this->evening->id, 'branch_id' => $this->khoroolol->id, 'start_time' => '15:30', 'end_time' => '20:00'],
        ]]])->assertOk();

        $shifts = collect($res->json('board.shifts'))->sortBy('start_time')->values();
        $this->assertSame($this->doctorMorning->id, $shifts[0]['template_id'], 'Эмчид эмчийн "Ө" загвар');
        $this->assertSame('09:00', $shifts[0]['start_time']);
        $this->assertSame($this->sansar->id, $shifts[0]['branch_id']);
        $this->assertSame($this->khoroolol->id, $shifts[1]['branch_id']);
        $this->assertSame([], $res->json('board.conflicts'));

        // Давхцсан цаг → алдаа
        $res = $this->setDays($hr, [['employee_id' => $doctor->id, 'date' => '2026-10-06', 'shifts' => [
            ['template_id' => $this->morning->id],
            ['branch_id' => $this->khoroolol->id, 'start_time' => '14:00', 'end_time' => '20:00'],
        ]]]);
        $this->assertContains('overlap', array_column($res->json('board.conflicts'), 'code'));
        $this->assertSame(720, $res->json('board.hours.'.$doctor->id), 'Цагийн нийлбэр: 09–15 (6ц) + 14–20 (6ц)');
    }

    public function test_pattern_fills_empty_days_skips_leave_and_copy_week_aligns_weekdays(): void
    {
        $hr = $this->hr();
        $anu = $this->employee('Ану');
        $days = array_fill(0, 7, []);
        foreach ([0, 1, 2, 3, 4] as $i) {
            $days[$i] = [['template_id' => $this->morning->id, 'branch_id' => null]];
        }
        SchedulePattern::create(['employee_id' => $anu->id, 'cycle_weeks' => 1, 'starts_on' => '2026-09-28', 'days' => $days]);
        LeaveRequest::create(['employee_id' => $anu->id, 'start_date' => '2026-10-07', 'end_date' => '2026-10-07',
            'leave_type' => 'personal', 'reason' => 'гэр', 'status' => 'approved']);

        $res = $this->actingAs($hr)->postJson('/hr/schedule/generate', ['branch' => $this->sansar->id, 'view' => 'week', 'date' => '2026-10-05'])
            ->assertOk();

        $this->assertSame(['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09'], collect($res->json('board.shifts'))->pluck('date')->sort()->values()->all());

        // Дараагийн 7 хоногт гарагаар нь хуулах
        $res = $this->actingAs($hr)->postJson('/hr/schedule/copy', [
            'source_monday' => '2026-10-05', 'branch' => $this->sansar->id, 'view' => 'week', 'date' => '2026-10-12',
        ])->assertOk();
        $this->assertSame(['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-16'], collect($res->json('board.shifts'))->pluck('date')->sort()->values()->all());
    }

    public function test_manager_is_limited_to_own_branch_and_permitted_positions(): void
    {
        $managerUser = User::factory()->create();
        $manager = $this->employee('Менежер', user: $managerUser);
        $manager->update(['schedule_permissions' => [(string) $this->receptionPos->id]]);

        $ownReception = $this->employee('Ану');
        $ownDoctor = $this->employee('Сараа', $this->doctorPos);
        $otherBranch = $this->employee('Дорж', branch: $this->khoroolol);

        $url = '/my/schedule-manage/days';
        $this->setDays($managerUser, [['employee_id' => $ownReception->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->morning->id]]]], $url)
            ->assertOk();
        $this->setDays($managerUser, [['employee_id' => $ownDoctor->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->morning->id]]]], $url)
            ->assertForbidden();
        $this->setDays($managerUser, [['employee_id' => $otherBranch->id, 'date' => '2026-10-06', 'shifts' => [['template_id' => $this->morning->id]]]], $url)
            ->assertForbidden();

        // Өөр салбарт ээлж тавихыг хүссэн ч өөрийн салбар руу барина
        $res = $this->setDays($managerUser, [['employee_id' => $ownReception->id, 'date' => '2026-10-07', 'shifts' => [
            ['template_id' => $this->morning->id, 'branch_id' => $this->khoroolol->id],
        ]]], $url, ['branch' => $this->khoroolol->id])->assertOk();
        $this->assertSame($this->sansar->id, $res->json('board.branch_id'));
        $this->assertSame($this->sansar->id, Shift::whereDate('date', '2026-10-07')->sole()->branch_id);

        $this->actingAs($managerUser)->postJson('/my/schedule-manage/publish', ['view' => 'week', 'date' => '2026-10-05'])->assertOk();
        $this->assertSame(2, Shift::published()->count());

        $this->actingAs(User::factory()->create())->getJson('/my/schedule-manage/board')->assertForbidden();
    }

    public function test_attendance_compares_with_published_schedule(): void
    {
        $hr = $this->hr();
        $anu = $this->employee('Ану');
        $bold = $this->employee('Болд');
        $this->setDays($hr, [
            ['employee_id' => $anu->id, 'date' => '2026-10-02', 'shifts' => [['template_id' => $this->morning->id]]],
            ['employee_id' => $bold->id, 'date' => '2026-10-02', 'shifts' => [['template_id' => $this->morning->id]]],
            ['employee_id' => $bold->id, 'date' => '2026-10-03', 'shifts' => [['template_id' => $this->morning->id]]],
        ], params: ['date' => '2026-09-28']);
        $this->actingAs($hr)->postJson('/hr/schedule/publish', ['branch' => $this->sansar->id, 'view' => 'week', 'date' => '2026-09-28']);
        // Нийтлээгүй ноорог ирцэд нөлөөлөхгүй
        $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-01', 'shifts' => [['template_id' => $this->morning->id]]]], params: ['date' => '2026-09-28']);

        AttendanceLog::create(['employee_id' => $anu->id, 'date' => '2026-10-02',
            'checked_in_at' => '2026-10-02 08:47:10', 'checked_out_at' => '2026-10-02 17:05:00']);
        AttendanceLog::create(['employee_id' => $bold->id, 'date' => '2026-10-02',
            'checked_in_at' => '2026-10-02 08:33:00', 'checked_out_at' => '2026-10-02 16:00:00']);
        AttendanceLog::create(['employee_id' => $anu->id, 'date' => '2026-10-01',
            'checked_in_at' => '2026-10-01 09:00:00', 'checked_out_at' => '2026-10-01 12:00:00']);

        $report = (new AttendanceReport('2026-10-01', '2026-10-31', $this->sansar->id))->build();
        $rows = collect($report['rows'])->keyBy(fn ($r) => $r['employee_name'].'|'.$r['date']);

        $anuDay = $rows['Б.Ану|2026-10-02'];
        $this->assertSame('late', $anuDay['status']);
        $this->assertSame(17, $anuDay['late_minutes']);
        $this->assertSame(35, $anuDay['overtime_minutes']);

        $boldDay = $rows['Б.Болд|2026-10-02'];
        $this->assertSame('on_time', $boldDay['status'], '3 минут нь хүлцэл (5) дотор');
        $this->assertSame(30, $boldDay['early_leave_minutes']);

        $this->assertSame('absent', $rows['Б.Болд|2026-10-03']['status']);
        $this->assertSame('unscheduled', $rows['Б.Ану|2026-10-01']['status'], 'Ноорог хуваарь тооцогдохгүй');

        $summary = collect($report['summary'])->keyBy('employee_name');
        $this->assertSame(1, $summary['Б.Болд']['absent_days']);
        $this->assertSame(2, $summary['Б.Болд']['planned_days']);
        $this->assertSame(1, $summary['Б.Ану']['late_count']);

        $this->actingAs($hr)->get('/hr/attendance?year=2026&month=10')->assertOk();
    }

    public function test_shift_swap_flow_reassigns_published_shift(): void
    {
        Notification::fake();
        $hr = $this->hr();
        $anuUser = User::factory()->create();
        $boldUser = User::factory()->create();
        $anu = $this->employee('Ану', user: $anuUser);
        $bold = $this->employee('Болд', user: $boldUser);

        $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-08', 'shifts' => [['template_id' => $this->morning->id]]]]);
        $this->actingAs($hr)->postJson('/hr/schedule/publish', ['branch' => $this->sansar->id, 'date' => '2026-10-05']);
        $shift = Shift::published()->sole();

        $this->actingAs($anuUser)->post('/my/work-schedule/swaps', [
            'shift_id' => $shift->id, 'target_employee_id' => $bold->id, 'note' => 'эмнэлэгт үзүүлнэ',
        ])->assertSessionHas('success');
        $swap = ShiftSwapRequest::sole();
        Notification::assertSentTo($boldUser, ShiftSwapNotice::class);

        // Өөр хүн хариулж чадахгүй
        $this->actingAs($anuUser)->patch("/my/work-schedule/swaps/{$swap->id}/respond", ['accept' => true])->assertSessionHasErrors('swap');

        $this->actingAs($boldUser)->patch("/my/work-schedule/swaps/{$swap->id}/respond", ['accept' => true]);
        $this->assertSame(ShiftSwapRequest::PENDING_APPROVAL, $swap->fresh()->status);

        $this->actingAs($hr)->patch("/hr/schedule/swaps/{$swap->id}", ['approve' => true])->assertSessionHas('success');
        $this->assertSame($bold->id, $shift->fresh()->employee_id);
        $this->assertNotNull(RosterLookup::forDay($bold->id, '2026-10-08'));
        Notification::assertSentTo($anuUser, ShiftSwapNotice::class, fn ($n) => $n->event === 'approved');
    }

    public function test_unavailable_day_and_pending_leave_show_as_warnings(): void
    {
        $hr = $this->hr();
        $user = User::factory()->create();
        $anu = $this->employee('Ану', user: $user);

        $this->actingAs($user)->post('/my/work-schedule/availability', ['date' => '2026-10-07', 'note' => 'шалгалт'])
            ->assertSessionHas('success');
        $this->assertSame(1, ScheduleAvailability::count());
        $this->actingAs($user)->post('/my/work-schedule/availability', ['date' => '2026-10-01'])->assertSessionHasErrors('date');

        $res = $this->setDays($hr, [['employee_id' => $anu->id, 'date' => '2026-10-07', 'shifts' => [['template_id' => $this->morning->id]]]]);
        $codes = array_column($res->json('board.conflicts'), 'code');
        $this->assertContains('unavailable', $codes);
        $this->assertSame('шалгалт', $res->json('board.unavailable.0.note'));
    }

    public function test_legacy_rows_are_converted_to_published_shifts(): void
    {
        $emp = $this->employee('Ану');
        $manager = $this->employee('Менежер');
        $manager->update(['schedule_permissions' => ['reception', 'xray']]);
        DB::table('employee_work_schedules')->insert([
            'employee_id' => $emp->id, 'date' => '2026-09-01', 'shift_type' => 'morning',
            'start_time' => '08:30:00', 'end_time' => '16:30:00', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('ortho_schedules')->insert([
            'employee_id' => $emp->id, 'date' => '2026-09-02', 'state' => 'vacation', 'created_at' => now(), 'updated_at' => now(),
        ]);

        (include database_path('migrations/2026_10_05_200004_migrate_legacy_schedules.php'))->up();

        $shifts = Shift::where('source', 'legacy')->orderBy('date')->get();
        $this->assertCount(2, $shifts);
        $this->assertSame('published', $shifts[0]->status);
        $this->assertSame($this->morning->id, $shifts[0]->shift_template_id);
        $this->assertSame($this->sansar->id, $shifts[0]->branch_id);
        $this->assertSame('off', $shifts[1]->kind);
        // 'reception' → "Ресепшн" албан тушаалын id; хуучин таб түлхүүр үлдэхгүй
        $perms = $manager->fresh()->schedule_permissions;
        $this->assertContains((string) $this->receptionPos->id, $perms);
        $this->assertTrue(collect($perms)->every(fn ($p) => ctype_digit($p)));
        $this->assertNotContains((string) $this->doctorPos->id, $perms);
    }
}
