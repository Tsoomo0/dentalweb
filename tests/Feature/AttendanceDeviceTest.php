<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\HR\AttendanceDevice;
use App\Models\HR\AttendanceDeviceUser;
use App\Models\HR\AttendanceLog;
use App\Models\HR\AttendancePunch;
use App\Models\HR\Employee;
use App\Models\HR\Position;
use App\Models\Role;
use App\Models\User;
use App\Notifications\AttendanceDeviceOffline;
use App\Services\Attendance\DeviceUserMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Ирцийн гурван арга нэг урсгалаар нийлэх нь:
 *   - 4370 агент (/api/attendance/ingest) — токен, idempotent, PIN автомат тааруулалт
 *   - ADMS push (/iclock/*) — бүртгэлгүй SN идэвхгүй үүсэх, ATTLOG/OPERLOG задлах
 *   - Утсаар байршлаар — салбарт хаалттай бол татгалзах, төхөөрөмжийнхтэй нэгтгэгдэх
 *   - USB .dat файл, HR-ийн гар тааруулалт
 */
class AttendanceDeviceTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-05 12:00:00');
        $this->branch = Branch::create(['name' => 'Сансар']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function employee(string $firstName = 'Билгүүн', ?User $user = null): Employee
    {
        $position = Position::firstOrCreate(['name' => 'Сувилагч'], ['portal' => 'clinic']);

        return Employee::create([
            'user_id' => $user?->id,
            'last_name' => 'Бат',
            'first_name' => $firstName,
            'branch_id' => $this->branch->id,
            'position_id' => $position->id,
            'salary' => 1000000,
            'status' => 'active',
        ]);
    }

    private function pullDevice(array $overrides = []): array
    {
        $device = AttendanceDevice::create(array_merge([
            'name' => 'JDF200',
            'branch_id' => $this->branch->id,
            'connection_type' => AttendanceDevice::TYPE_PULL,
            'ip_address' => '192.168.1.201',
        ], $overrides));

        return [$device, $device->issueApiToken()];
    }

    /** HR төхөөрөмжийн PIN-ийг ажилтантай нэг удаа тааруулсан төлөв. */
    private function mapPin(AttendanceDevice $device, string $pin, Employee $employee): void
    {
        AttendanceDeviceUser::create(['attendance_device_id' => $device->id, 'device_user_pin' => $pin, 'employee_id' => $employee->id]);
    }

    private function ingest(string $token, array $punches, array $extra = [])
    {
        return $this->withToken($token)->postJson('/api/attendance/ingest', array_merge(['punches' => $punches], $extra));
    }

    private function hrUser(): User
    {
        return User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'admin'])->id]);
    }

    public function test_agent_requires_a_valid_token_of_an_active_pull_device(): void
    {
        [$device, $token] = $this->pullDevice();

        $this->postJson('/api/attendance/ingest', ['punches' => []])->assertStatus(401);
        $this->ingest('att_wrong', [])->assertStatus(401);

        $device->update(['is_active' => false]);
        $this->ingest($token, [])->assertStatus(403);

        $device->update(['is_active' => true]);
        $this->ingest($token, [])->assertOk()->assertJson(['ok' => true, 'accepted' => 0]);
        $this->assertNotNull($device->fresh()->last_seen_at, 'Хоосон хүсэлт ч амьд байгаагийн дохио болно');
    }

    public function test_agent_punches_build_daily_attendance_and_are_idempotent(): void
    {
        $employee = $this->employee();
        [$device, $token] = $this->pullDevice();
        $this->mapPin($device, '23', $employee);

        $punches = [
            ['pin' => '23', 'punched_at' => '2026-10-05 08:52:10', 'punch_type' => 0, 'verify_type' => 1],
            ['pin' => '23', 'punched_at' => '2026-10-05 13:01:00', 'punch_type' => 0, 'verify_type' => 1],
            ['pin' => '23', 'punched_at' => '2026-10-05 18:05:44', 'punch_type' => 0, 'verify_type' => 1],
        ];

        $this->ingest($token, $punches)->assertOk()->assertJson(['accepted' => 3, 'duplicates' => 0, 'unmatched_pins' => []]);

        // Агент давхцалтайгаар дахин илгээсэн ч давхардахгүй
        $this->ingest($token, $punches)->assertOk()->assertJson(['accepted' => 0, 'duplicates' => 3]);

        $this->assertSame(3, AttendancePunch::count());
        $this->assertSame($employee->id, AttendancePunch::first()->employee_id);

        $log = AttendanceLog::sole();
        $this->assertSame('08:52', $log->checked_in_at->format('H:i'));
        $this->assertSame('18:05', $log->checked_out_at->format('H:i'));
        $this->assertSame('pull', $log->check_in_source);
        $this->assertSame('pull', $log->check_out_source);
    }

    public function test_pin_equal_to_employee_number_is_not_auto_mapped(): void
    {
        $this->employee(); // EMP-0001 — гэвч төхөөрөмж дээрх PIN 1 өөр хүн байж болно
        [, $token] = $this->pullDevice();

        $this->ingest($token, [['pin' => '1', 'punched_at' => '2026-10-05 09:00:00']])
            ->assertOk()->assertJson(['unmatched_pins' => ['1']]);

        $this->assertNull(AttendancePunch::sole()->employee_id, 'Дугаараар таахгүй — буруу хүнд ирц бичигдэхээс сэргийлнэ');
        $this->assertSame(0, AttendanceLog::count());
    }

    public function test_device_names_are_suggested_and_confirmed_in_bulk(): void
    {
        $bilguun = $this->employee('Билгүүн');
        $enkhjargal = $this->employee('Энхжаргал');
        $this->employee('Сараа');
        $this->employee('Сараа'); // ижил нэртэй хоёр — санал гаргахгүй
        [, $token] = $this->pullDevice();

        $this->ingest($token, [
            ['pin' => '15', 'punched_at' => '2026-10-05 08:50:00'],
            ['pin' => '16', 'punched_at' => '2026-10-05 08:55:00'],
        ], ['users' => [
            ['pin' => '15', 'name' => 'Bilguun'],
            ['pin' => '16', 'name' => 'B.Enkhjargal'],
            ['pin' => '17', 'name' => 'Saraa'],
            ['pin' => '18', 'name' => '张伟'],
        ]])->assertOk();

        $hr = $this->hrUser();
        $suggestions = [];

        $this->actingAs($hr)->get('/hr/attendance/devices')->assertOk()
            ->assertInertia(function ($page) use (&$suggestions) {
                foreach ($page->toArray()['props']['deviceUsers'] as $u) {
                    $suggestions[$u['pin']] = $u['suggestion']['employee_id'] ?? null;
                }
            });

        $this->assertSame(['15' => $bilguun->id, '16' => $enkhjargal->id, '17' => null, '18' => null], $suggestions);
        $this->assertSame(0, AttendanceLog::count(), 'Санал нь HR батлах хүртэл ирцэд орохгүй');

        $ids = AttendanceDeviceUser::pluck('id', 'device_user_pin');
        $this->actingAs($hr)->post('/hr/attendance/device-users/bulk-map', ['mappings' => [
            ['id' => $ids['15'], 'employee_id' => $bilguun->id],
            ['id' => $ids['16'], 'employee_id' => $enkhjargal->id],
        ]])->assertRedirect()->assertSessionHas('success');

        $this->assertSame(2, AttendanceLog::count());
        $this->assertSame($bilguun->id, AttendancePunch::where('device_user_pin', '15')->sole()->employee_id);
    }

    public function test_name_skeleton_matches_common_transliterations(): void
    {
        $matcher = new DeviceUserMatcher;

        foreach ([
            ['Өлзий', 'Ulzii'], ['Өлзий', 'Olzii'], ['Энхжаргал', 'Enkhjargal'], ['Цэцэгмаа', 'Tsetsegmaa'],
            ['Бат-Эрдэнэ', 'Bat-Erdene'], ['Хулан', 'Khulan'], ['Хулан', 'Hulan'], ['Түвшин', 'Tuvshin'],
            ['Баярмаа', 'Bayarmaa'], ['Номин', 'NOMIN'],
        ] as [$cyrillic, $latin]) {
            $this->assertSame($matcher->skeleton($cyrillic), $matcher->skeleton($latin), "{$cyrillic} ↔ {$latin}");
        }

        $this->assertNotSame($matcher->skeleton('Болд'), $matcher->skeleton('Бат'));
    }

    public function test_repeated_taps_use_the_first_scan_for_arrival_and_departure(): void
    {
        [$device, $token] = $this->pullDevice();
        $this->mapPin($device, '1', $this->employee());

        $this->ingest($token, [
            ['pin' => '1', 'punched_at' => '2026-10-05 08:50:12'],
            ['pin' => '1', 'punched_at' => '2026-10-05 08:51:03'],
            // тарахдаа эргэлзээд гурав дарсан
            ['pin' => '1', 'punched_at' => '2026-10-05 18:00:05'],
            ['pin' => '1', 'punched_at' => '2026-10-05 18:00:40'],
            ['pin' => '1', 'punched_at' => '2026-10-05 18:03:10'],
        ])->assertOk();

        $log = AttendanceLog::sole();
        $this->assertSame('08:50:12', $log->checked_in_at->format('H:i:s'));
        $this->assertSame('18:00:05', $log->checked_out_at->format('H:i:s'), 'Тарсан = тарахдаа анх уншуулсан цаг');
    }

    public function test_pin_of_inactive_employee_is_released_when_reused(): void
    {
        $leaver = $this->employee('Болд');
        [$device, $token] = $this->pullDevice();
        $this->mapPin($device, '5', $leaver);

        $this->ingest($token, [['pin' => '5', 'punched_at' => '2026-10-01 09:00:00']])->assertOk();
        $this->assertSame($leaver->id, AttendancePunch::sole()->employee_id);

        // Ажлаас гарсан — PIN 5-ыг төхөөрөмж дээр шинэ хүнд олгосон
        $leaver->update(['status' => 'inactive']);

        // Хуучин бүртгэлийг давхцалтайгаар дахин илгээх нь тааруулалтыг салгахгүй
        $this->ingest($token, [['pin' => '5', 'punched_at' => '2026-10-01 09:00:00']])->assertOk();
        $this->assertSame($leaver->id, AttendanceDeviceUser::where('device_user_pin', '5')->sole()->employee_id);

        $this->ingest($token, [['pin' => '5', 'punched_at' => '2026-10-05 09:00:00']])
            ->assertOk()->assertJson(['unmatched_pins' => ['5']]);

        $this->assertNull(AttendanceDeviceUser::where('device_user_pin', '5')->sole()->employee_id, 'Шинэ хүнийг HR тааруулна');
        $this->assertNull(AttendancePunch::where('punched_at', '2026-10-05 09:00:00')->sole()->employee_id);
        $this->assertSame($leaver->id, AttendancePunch::where('punched_at', '2026-10-01 09:00:00')->sole()->employee_id, 'Хуучин түүх хэвээр');
    }

    public function test_hr_fixes_a_forgotten_check_out_and_can_undo_it(): void
    {
        $employee = $this->employee();
        [$device, $token] = $this->pullDevice();
        $this->mapPin($device, '1', $employee);
        $this->ingest($token, [['pin' => '1', 'punched_at' => '2026-10-04 08:55:00']])->assertOk();

        $hr = $this->hrUser();
        $this->actingAs($hr)->post('/hr/attendance/manual', [
            'employee_id' => $employee->id, 'date' => '2026-10-04', 'checked_out_at' => '18:00', 'note' => 'Тарахдаа мартсан',
        ])->assertRedirect()->assertSessionHas('success');

        $log = AttendanceLog::sole();
        $this->assertSame('08:55', $log->checked_in_at->format('H:i'));
        $this->assertSame('18:00', $log->checked_out_at->format('H:i'));
        $this->assertSame('manual', $log->check_out_source);

        $day = $this->actingAs($hr)->getJson("/hr/attendance/day?employee_id={$employee->id}&date=2026-10-04")->assertOk()->json('punches');
        $this->assertCount(2, $day);
        $this->assertFalse($day[0]['can_delete'], 'Төхөөрөмжийн бүртгэлийг устгахгүй');
        $this->assertTrue($day[1]['can_delete']);
        $this->assertSame('Тарахдаа мартсан', $day[1]['note']);
        $this->assertSame($hr->name, $day[1]['created_by']);

        // Төхөөрөмжийн бүртгэлийг устгах оролдлого татгалзагдана
        $this->actingAs($hr)->delete('/hr/attendance/punches/'.$day[0]['id'])->assertSessionHas('error');
        $this->assertSame(2, AttendancePunch::count());

        // Гараар нэмснээ буцаавал тарсан цаг арилна
        $this->actingAs($hr)->delete('/hr/attendance/punches/'.$day[1]['id'])->assertSessionHas('success');
        $this->assertNull(AttendanceLog::sole()->checked_out_at);
    }

    public function test_hr_adds_attendance_for_someone_with_no_punches(): void
    {
        $employee = $this->employee();
        $hr = $this->hrUser();

        $this->actingAs($hr)->post('/hr/attendance/manual', [
            'employee_id' => $employee->id, 'date' => '2026-10-05', 'checked_in_at' => '18:00', 'checked_out_at' => '09:00', 'note' => 'буруу',
        ])->assertSessionHasErrors('checked_out_at');

        $this->actingAs($hr)->post('/hr/attendance/manual', [
            'employee_id' => $employee->id, 'date' => '2026-10-05', 'checked_in_at' => '09:00', 'checked_out_at' => '18:00',
        ])->assertSessionHasErrors('note');

        $this->actingAs($hr)->post('/hr/attendance/manual', [
            'employee_id' => $employee->id, 'date' => '2026-10-05', 'checked_in_at' => '09:00', 'checked_out_at' => '18:00', 'note' => 'Төхөөрөмж эвдэрсэн',
        ])->assertSessionHas('success');

        $log = AttendanceLog::sole();
        $this->assertSame('09:00', $log->checked_in_at->format('H:i'));
        $this->assertSame('18:00', $log->checked_out_at->format('H:i'));
        $this->assertSame(540, $log->worked_minutes);
    }

    public function test_silent_device_is_reported_once_during_working_hours(): void
    {
        Notification::fake();
        $hr = $this->hrUser();
        [$device, $token] = $this->pullDevice();

        // Даваа 12:00 — ажлын цаг. Төхөөрөмж 10:00-аас хойш дуугүй.
        Carbon::setTestNow('2026-10-05 10:00:00');
        $this->ingest($token, [])->assertOk();
        Carbon::setTestNow('2026-10-05 12:00:00');

        $this->artisan('attendance:check-devices')->assertSuccessful();
        Notification::assertSentToTimes($hr, AttendanceDeviceOffline::class, 1);

        $this->artisan('attendance:check-devices')->assertSuccessful();
        Notification::assertSentToTimes($hr, AttendanceDeviceOffline::class, 1);

        // Дахин холбогдмогц тэмдэглэгээ арилна
        $this->ingest($token, [])->assertOk();
        $this->assertNull($device->fresh()->offline_notified_at);
    }

    public function test_no_offline_alert_outside_working_hours_or_right_after_opening(): void
    {
        Notification::fake();
        $this->hrUser();
        [, $token] = $this->pullDevice();
        Carbon::setTestNow('2026-10-03 18:00:00');
        $this->ingest($token, [])->assertOk();

        Carbon::setTestNow('2026-10-04 12:00:00'); // Ням — амралтын өдөр
        $this->artisan('attendance:check-devices')->assertSuccessful();

        Carbon::setTestNow('2026-10-05 09:30:00'); // Даваа, нээгдээд хагас цаг — компьютер дөнгөж асаж байна
        $this->artisan('attendance:check-devices')->assertSuccessful();

        Notification::assertNothingSent();
    }

    public function test_worked_minutes_match_the_displayed_clock_times(): void
    {
        [$device, $token] = $this->pullDevice();
        $this->mapPin($device, '1', $this->employee());

        $this->ingest($token, [
            ['pin' => '1', 'punched_at' => '2026-10-04 17:23:19'],
            ['pin' => '1', 'punched_at' => '2026-10-04 18:24:10'],
        ])->assertOk();

        // Дэлгэц дээр 17:23 → 18:24 гэж харагдах тул 61 минут (секундээр бол 60.85)
        $this->assertSame(61, AttendanceLog::sole()->worked_minutes);
    }

    public function test_double_tap_is_not_counted_as_check_out(): void
    {
        [$device, $token] = $this->pullDevice();
        $this->mapPin($device, '1', $this->employee());

        $this->ingest($token, [
            ['pin' => '1', 'punched_at' => '2026-10-05 08:52:10'],
            ['pin' => '1', 'punched_at' => '2026-10-05 08:53:30'],
        ])->assertOk();

        $log = AttendanceLog::sole();
        $this->assertSame('08:52', $log->checked_in_at->format('H:i'));
        $this->assertNull($log->checked_out_at, 'Эргэлзээд хоёр дарсныг тарсан гэж үзэхгүй');
    }

    public function test_unmapped_pin_is_kept_and_attached_when_hr_maps_it(): void
    {
        $first = $this->employee('Билгүүн');
        $second = $this->employee('Сараа');
        [$device, $token] = $this->pullDevice();

        $this->ingest($token, [['pin' => '77', 'punched_at' => '2026-10-04 09:00:00']], [
            'users' => [['pin' => '77', 'name' => 'Saraa']],
        ])->assertOk()->assertJson(['unmatched_pins' => ['77']]);

        $this->assertNull(AttendancePunch::sole()->employee_id);
        $this->assertSame(0, AttendanceLog::count());

        $deviceUser = AttendanceDeviceUser::where('device_user_pin', '77')->sole();
        $this->assertSame('Saraa', $deviceUser->name);

        $hr = $this->hrUser();
        $this->actingAs($hr)->patch("/hr/attendance/device-users/{$deviceUser->id}", ['employee_id' => $first->id])->assertRedirect();
        $this->assertSame($first->id, AttendanceLog::sole()->employee_id);

        // Буруу тааруулсныг засахад өдрийн нэгтгэл зөв ажилтан руу шилжинэ
        $this->actingAs($hr)->patch("/hr/attendance/device-users/{$deviceUser->id}", ['employee_id' => $second->id])->assertRedirect();
        $this->assertSame($second->id, AttendanceLog::sole()->employee_id);
        $this->assertSame($second->id, AttendancePunch::sole()->employee_id);
    }

    public function test_agent_connected_to_another_device_is_rejected(): void
    {
        [, $token] = $this->pullDevice(['serial_number' => 'ADQT194260189']);

        $this->ingest($token, [['pin' => '1', 'punched_at' => '2026-10-05 09:00:00']], [
            'device' => ['serial' => 'OTHER123456'],
        ])->assertStatus(409);

        $this->assertSame(0, AttendancePunch::count());
    }

    public function test_agent_fills_in_serial_and_clock_drift(): void
    {
        [$device, $token] = $this->pullDevice();

        $this->ingest($token, [], ['device' => [
            'serial' => 'ADQT194260189', 'firmware' => 'Ver 6.60 May  3 2016', 'device_time' => '2026-10-05 12:03:00',
            'records' => 41000, 'records_capacity' => 50000,
        ]])->assertOk();

        $device->refresh();
        $this->assertSame('ADQT194260189', $device->serial_number);
        $this->assertSame(180, $device->clock_drift_seconds);
        $this->assertSame(82, $device->storagePercent(), '80%-иас дээш — HR-д анхааруулга гарна');
    }

    public function test_unknown_push_device_registers_inactive_until_hr_activates_it(): void
    {
        $employee = $this->employee();

        $this->get('/iclock/cdata?SN=TX628A0001&options=all&pushver=2.4.1')
            ->assertOk()
            ->assertSee('GET OPTION FROM: TX628A0001', false)
            ->assertSee('ATTLOGStamp=None', false);

        $device = AttendanceDevice::where('serial_number', 'TX628A0001')->sole();
        $this->assertFalse($device->is_active);
        $this->assertSame('push', $device->connection_type);

        $body = "1\t2026-10-05 08:45:00\t0\t1\t0\t0\t0\n1\t2026-10-05 17:30:00\t1\t1\t0\t0\t0\n";

        $this->call('POST', '/iclock/cdata?SN=TX628A0001&table=ATTLOG&Stamp=100', [], [], [], [], $body)->assertStatus(403);
        $this->assertSame(0, AttendancePunch::count(), 'Идэвхжээгүй төхөөрөмжийн бүртгэлийг авахгүй — төхөөрөмж дахин илгээнэ');

        $device->update(['is_active' => true, 'branch_id' => $this->branch->id]);
        $this->mapPin($device, '1', $employee);

        $this->call('POST', '/iclock/cdata?SN=TX628A0001&table=ATTLOG&Stamp=100', [], [], [], [], $body)
            ->assertOk()->assertSee('OK', false);

        $this->assertSame(2, AttendancePunch::where('source', 'push')->count());
        $this->assertSame('100', $device->fresh()->push_stamp);

        $log = AttendanceLog::sole();
        $this->assertSame('08:45', $log->checked_in_at->format('H:i'));
        $this->assertSame('17:30', $log->checked_out_at->format('H:i'));
        $this->assertSame('push', $log->check_in_source);

        $this->get('/iclock/getrequest?SN=TX628A0001&INFO=Ver 6.60 Apr 28 2016,3,3,2,192.168.1.50')->assertOk()->assertSee('OK', false);
        $this->assertSame('Ver 6.60 Apr 28 2016', $device->fresh()->firmware);
    }

    public function test_push_operlog_user_lines_update_names(): void
    {
        AttendanceDevice::create([
            'name' => 'TX628', 'connection_type' => 'push', 'serial_number' => 'TX628A0002', 'branch_id' => $this->branch->id,
        ]);

        $body = "USER PIN=5\tName=Bold\tPri=0\tPasswd=\tCard=\tGrp=1\nOPLOG 4\t0\t2026-10-05 10:00:00\t5\t0\t0\t0\n";
        $this->call('POST', '/iclock/cdata?SN=TX628A0002&table=OPERLOG', [], [], [], [], $body)->assertOk();

        $this->assertSame('Bold', AttendanceDeviceUser::where('device_user_pin', '5')->sole()->name);
    }

    public function test_gps_and_device_punches_merge_into_one_day(): void
    {
        $user = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'employee'])->id]);
        $employee = $this->employee('Билгүүн', $user);
        [$device, $token] = $this->pullDevice();
        $this->mapPin($device, '7', $employee);

        Carbon::setTestNow('2026-10-05 09:10:00');
        $this->actingAs($user)->post('/my/attendance/check-in', ['lat' => 47.9, 'lng' => 106.9])->assertRedirect();

        $log = AttendanceLog::sole();
        $this->assertSame('gps', $log->check_in_source);
        $this->assertSame('09:10', $log->checked_in_at->format('H:i'));

        // Хуруугаа түрүүн уншуулсан байсан — эрт нь ирсэн цаг болно
        $this->ingest($token, [
            ['pin' => '7', 'punched_at' => '2026-10-05 08:58:00'],
            ['pin' => '7', 'punched_at' => '2026-10-05 18:02:00'],
        ])->assertOk();

        $log->refresh();
        $this->assertSame('08:58', $log->checked_in_at->format('H:i'));
        $this->assertSame('pull', $log->check_in_source);
        $this->assertSame('18:02', $log->checked_out_at->format('H:i'));
        $this->assertSame(3, AttendancePunch::count());
    }

    public function test_gps_check_in_is_blocked_when_branch_uses_fingerprint_only(): void
    {
        $user = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'employee'])->id]);
        $this->employee('Билгүүн', $user);
        $this->branch->update(['attendance_gps_enabled' => false]);

        $this->actingAs($user)->post('/my/attendance/check-in', ['lat' => 47.9, 'lng' => 106.9])
            ->assertSessionHasErrors('geofence');

        $this->assertSame(0, AttendancePunch::count());
        $this->assertSame(0, AttendanceLog::count());
    }

    public function test_usb_dat_file_import(): void
    {
        [$device] = $this->pullDevice();
        $this->mapPin($device, '1', $this->employee());

        $dat = "        1\t2026-10-03 08:59:01\t1\t0\t1\t0\n        1\t2026-10-03 18:10:22\t1\t1\t1\t0\ngarbage line\n";
        $file = UploadedFile::fake()->createWithContent('1_attlog.dat', $dat);

        $this->actingAs($this->hrUser())
            ->post("/hr/attendance/devices/{$device->id}/import", ['file' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(2, AttendancePunch::where('source', 'usb')->count());
        $log = AttendanceLog::sole();
        $this->assertSame('2026-10-03', $log->date->toDateString());
        $this->assertSame('18:10', $log->checked_out_at->format('H:i'));
    }

    public function test_device_with_punches_cannot_be_deleted(): void
    {
        $this->employee();
        [$device, $token] = $this->pullDevice();
        $this->ingest($token, [['pin' => '1', 'punched_at' => '2026-10-05 09:00:00']]);

        $this->actingAs($this->hrUser())->delete("/hr/attendance/devices/{$device->id}")->assertSessionHas('error');
        $this->assertModelExists($device);
    }

    public function test_hr_creates_pull_device_and_receives_token_once(): void
    {
        $this->actingAs($this->hrUser())->post('/hr/attendance/devices', [
            'name' => 'Сансар JDF200',
            'branch_id' => $this->branch->id,
            'connection_type' => 'pull',
            'ip_address' => '192.168.1.201',
            'is_active' => true,
        ])->assertRedirect()->assertSessionHas('attendance_device_token');

        $device = AttendanceDevice::sole();
        $token = session('attendance_device_token')['token'];

        $this->assertSame(hash('sha256', $token), $device->getRawOriginal('api_token_hash'));
        $this->ingest($token, [])->assertOk();
    }
}
