<?php

namespace Tests\Feature;

use App\Console\Commands\EscalateMissedCalls;
use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallBlockedNumber;
use App\Models\CallPro\CallQueue;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\CallSummaryReport;
use App\Notifications\MissedCall;
use App\Notifications\MissedCallEscalated;
use App\Services\CallPro\CallSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Ажлын цаг, спам, SLA, тайлан — дөрвөн үйл ажиллагааны боломж.
 */
class CallOperationsTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->branch = Branch::create(['name' => 'Сансар']);
        CallQueue::create(['name' => 'sansar', 'branch_id' => $this->branch->id]);

        // Даваа–Бямба, 09:00–20:00
        $this->setWorkHours('09:00', '20:00', '1,2,3,4,5,6');
    }

    /** Заасан гарагуудад ижил цаг тавина. */
    private function setWorkHours(string $start, string $end, string $days): void
    {
        $hours = [];

        foreach (explode(',', $days) as $day) {
            $hours[trim($day)] = ['start' => $start, 'end' => $end];
        }

        $this->setSchedule($hours);
    }

    /** @param  array<string,array{start:string,end:string}>  $hours */
    private function setSchedule(array $hours): void
    {
        Setting::updateOrCreate(
            ['key' => 'call_work_hours'],
            ['value' => json_encode($hours), 'group' => 'callpro', 'label' => 'call_work_hours'],
        );

        Setting::clearCache();
    }

    private function admin(): User
    {
        return User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'admin'])->id]);
    }

    private function reception(): User
    {
        return User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'receptionist'])->id,
            'branch_id' => $this->branch->id,
        ]);
    }

    private function hook(string $event, array $payload)
    {
        return $this->postJson('/webhooks/callpro/'.$event, $payload);
    }

    /* ── A6: ажлын цаг ─────────────────────────────────────────────────── */

    public function test_working_time_respects_hours_and_days(): void
    {
        // Лхагва 14:00 — ажлын цаг
        $this->assertTrue(CallSettings::isWorkingTime(Carbon::parse('2026-09-02 14:00')));
        // Лхагва 07:00 — эрт
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-02 07:00')));
        // Лхагва 21:00 — оройтсон
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-02 21:00')));
        // Ням гараг — амралт
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-06 14:00')));
    }

    /** Гараг бүр өөрийн цагтай — бямба нь богино ажилладаг нь түгээмэл. */
    public function test_each_day_keeps_its_own_hours(): void
    {
        $this->setSchedule([
            '3' => ['start' => '09:00', 'end' => '20:00'],   // Лхагва
            '6' => ['start' => '10:00', 'end' => '15:00'],   // Бямба
        ]);

        // Лхагва 19:00 — ажлын цаг
        $this->assertTrue(CallSettings::isWorkingTime(Carbon::parse('2026-09-02 19:00')));
        // Бямба 19:00 — аль хэдийн хаагдсан
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-05 19:00')));
        // Бямба 11:00 — нээлттэй
        $this->assertTrue(CallSettings::isWorkingTime(Carbon::parse('2026-09-05 11:00')));
        // Бямба 09:30 — хараахан нээгээгүй
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-05 09:30')));
        // Даваа огт хуваарьгүй
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-07 12:00')));
    }

    /**
     * Шөнө дамжсан ээлж өмнөх өдрийнхөө хуваариар үргэлжилнэ.
     *
     * Баасны 20:00–02:00 ээлжийн үед бямбын 01:00 цагийн дуудлага «цагаас
     * гадуур» гэж тэмдэглэгдвэл ажилтан буруутай мэт харагдана.
     */
    public function test_overnight_shift_carries_into_the_next_day(): void
    {
        $this->setSchedule([
            '5' => ['start' => '20:00', 'end' => '02:00'],   // Баасан шөнө
        ]);

        // Баасан 22:00 — ээлжийн эхэнд
        $this->assertTrue(CallSettings::isWorkingTime(Carbon::parse('2026-09-04 22:00')));
        // Бямба 01:00 — баасны ээлж үргэлжилсээр
        $this->assertTrue(CallSettings::isWorkingTime(Carbon::parse('2026-09-05 01:00')));
        // Бямба 03:00 — ээлж дууссан
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-05 03:00')));
        // Баасан 19:00 — хараахан эхлээгүй
        $this->assertFalse(CallSettings::isWorkingTime(Carbon::parse('2026-09-04 19:00')));
    }

    /** Админ гараг бүрийн цагийг тусад нь хадгална. */
    public function test_admin_can_save_per_day_hours(): void
    {
        $this->actingAs($this->admin())
            ->patch('/admin/call-settings/operations', [
                'work_hours' => [
                    '1' => ['start' => '09:00', 'end' => '20:00'],
                    '6' => ['start' => '10:00', 'end' => '15:00'],
                ],
                'sla_minutes' => 30,
                'notify_after_hours' => false,
                'report_time' => '20:30',
            ])
            ->assertRedirect();

        Setting::clearCache();

        $this->assertSame([1, 6], CallSettings::workDays());
        $this->assertSame(['start' => '10:00', 'end' => '15:00'], CallSettings::workHours()[6]);
    }

    /** Нэг ч ажлын өдөргүй бол бүх дуудлага «цагаас гадуур» болж мэдэгдэл унтарна. */
    public function test_empty_schedule_is_rejected(): void
    {
        $this->actingAs($this->admin())
            ->patch('/admin/call-settings/operations', [
                'work_hours' => [],
                'sla_minutes' => 30,
                'report_time' => '20:30',
            ])
            ->assertSessionHasErrors('work_hours');
    }

    /** Ижил эхлэх/дуусах цаг нь 0 цаг уу, 24 цаг уу гэдэг нь ойлгомжгүй. */
    public function test_identical_start_and_end_is_rejected(): void
    {
        $this->actingAs($this->admin())
            ->patch('/admin/call-settings/operations', [
                'work_hours' => ['1' => ['start' => '09:00', 'end' => '09:00']],
                'sla_minutes' => 30,
                'report_time' => '20:30',
            ])
            ->assertSessionHasErrors('work_hours.1.end');
    }

    /** Тохиргоо алдагдсан ч систем чимээгүй болох ёсгүй. */
    public function test_broken_schedule_falls_back_to_the_default(): void
    {
        Setting::updateOrCreate(
            ['key' => 'call_work_hours'],
            ['value' => 'эвдэрсэн', 'group' => 'callpro', 'label' => 'call_work_hours'],
        );
        Setting::clearCache();

        $this->assertSame([1, 2, 3, 4, 5, 6], CallSettings::workDays());
        $this->assertTrue(CallSettings::isWorkingTime(Carbon::parse('2026-09-02 14:00')));
    }

    public function test_after_hours_missed_call_is_flagged_and_silent(): void
    {
        Notification::fake();
        $this->reception();
        $this->admin();

        // Шөнийн 02:00 — хэн ч ажлын байран дээр байхгүй
        Carbon::setTestNow(Carbon::parse('2026-09-02 02:00'));

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => 'sansar']);

        $call = Call::first();
        $this->assertTrue($call->is_missed);
        $this->assertTrue($call->is_after_hours);
        // Шөнө дунд хэнийг ч сэрээхгүй
        $this->assertNull($call->missed_notified_at);
        Notification::assertNothingSent();

        Carbon::setTestNow();
    }

    public function test_after_hours_notification_can_be_enabled(): void
    {
        Notification::fake();
        $reception = $this->reception();

        Setting::updateOrCreate(
            ['key' => 'call_notify_after_hours'],
            ['value' => '1', 'group' => 'callpro', 'label' => 'notify'],
        );
        Setting::clearCache();

        Carbon::setTestNow(Carbon::parse('2026-09-02 02:00'));

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => 'sansar']);

        Notification::assertSentTo($reception, MissedCall::class);

        Carbon::setTestNow();
    }

    /* ── A7: спам ──────────────────────────────────────────────────────── */

    public function test_blocked_number_is_flagged_and_silent(): void
    {
        Notification::fake();
        $this->reception();

        CallBlockedNumber::create(['number_norm' => '99112233']);

        Carbon::setTestNow(Carbon::parse('2026-09-02 14:00'));

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => 'sansar']);

        $call = Call::first();
        $this->assertTrue($call->is_spam);
        $this->assertNull($call->missed_notified_at);
        Notification::assertNothingSent();

        Carbon::setTestNow();
    }

    public function test_blocking_a_number_marks_existing_calls_and_unblocking_restores(): void
    {
        $admin = $this->admin();

        $call = Call::create([
            'unique_id' => 's.1',
            'number' => '99112233',
            'number_norm' => '99112233',
            'direction' => 'inbound',
            'started_at' => now(),
            'is_missed' => true,
        ]);

        $this->actingAs($admin)
            ->post('/admin/calls/blocked', ['number' => '9911-2233', 'label' => 'Зар'])
            ->assertSessionHasNoErrors();

        $this->assertTrue($call->fresh()->is_spam);

        $blocked = CallBlockedNumber::where('number_norm', '99112233')->firstOrFail();

        $this->actingAs($admin)->delete("/admin/calls/blocked/{$blocked->id}");

        $this->assertFalse($call->fresh()->is_spam);
    }

    public function test_spam_calls_are_excluded_from_answer_rate(): void
    {
        Call::create(['unique_id' => 'a.1', 'number_norm' => '1', 'started_at' => now(), 'is_missed' => false]);
        Call::create(['unique_id' => 'a.2', 'number_norm' => '2', 'started_at' => now(), 'is_missed' => true, 'is_spam' => true]);

        // Спам дуудлага байхгүй бол хариулалт 100% байх ёстой (50% биш)
        $this->actingAs($this->admin())
            ->get('/admin/calls/reports')
            ->assertInertia(fn ($page) => $page
                ->where('totals.answer_rate', 100)
                ->where('totals.spam', 1)
            );
    }

    /* ── A4: SLA ───────────────────────────────────────────────────────── */

    public function test_sla_escalates_only_overdue_unhandled_calls(): void
    {
        Notification::fake();
        $admin = $this->admin();

        Carbon::setTestNow(Carbon::parse('2026-09-02 14:00'));

        // 40 минутын өмнөх — SLA (30 мин) хэтэрсэн
        $overdue = Call::create([
            'unique_id' => 'sla.1', 'number' => '99112233', 'number_norm' => '99112233',
            'started_at' => now()->subMinutes(40), 'is_missed' => true,
        ]);
        // 5 минутын өмнөх — хугацаа хэтрээгүй
        $fresh = Call::create([
            'unique_id' => 'sla.2', 'number' => '88112233', 'number_norm' => '88112233',
            'started_at' => now()->subMinutes(5), 'is_missed' => true,
        ]);
        // Хэтэрсэн ч аль хэдийн шийдэгдсэн
        Call::create([
            'unique_id' => 'sla.3', 'number' => '77112233', 'number_norm' => '77112233',
            'started_at' => now()->subMinutes(60), 'is_missed' => true, 'handled_at' => now(),
        ]);
        // Хэтэрсэн ч спам
        Call::create([
            'unique_id' => 'sla.4', 'number' => '66112233', 'number_norm' => '66112233',
            'started_at' => now()->subMinutes(60), 'is_missed' => true, 'is_spam' => true,
        ]);

        $this->artisan(EscalateMissedCalls::class)->assertSuccessful();

        $this->assertNotNull($overdue->fresh()->escalated_at);
        $this->assertNull($fresh->fresh()->escalated_at);

        Notification::assertSentToTimes($admin, MissedCallEscalated::class, 1);

        Carbon::setTestNow();
    }

    /** Нэг дуудлагад давтан сэрэмжлүүлэг явуулж болохгүй. */
    public function test_escalation_happens_only_once_per_call(): void
    {
        Notification::fake();
        $admin = $this->admin();

        Carbon::setTestNow(Carbon::parse('2026-09-02 14:00'));

        Call::create([
            'unique_id' => 'sla.5', 'number' => '99112233', 'number_norm' => '99112233',
            'started_at' => now()->subMinutes(40), 'is_missed' => true,
        ]);

        $this->artisan(EscalateMissedCalls::class);
        $this->artisan(EscalateMissedCalls::class);

        Notification::assertSentToTimes($admin, MissedCallEscalated::class, 1);

        Carbon::setTestNow();
    }

    public function test_escalation_skips_outside_working_hours(): void
    {
        Notification::fake();
        $this->admin();

        Carbon::setTestNow(Carbon::parse('2026-09-02 03:00'));

        Call::create([
            'unique_id' => 'sla.6', 'number' => '99112233', 'number_norm' => '99112233',
            'started_at' => now()->subMinutes(40), 'is_missed' => true,
        ]);

        $this->artisan(EscalateMissedCalls::class)->assertSuccessful();

        Notification::assertNothingSent();

        Carbon::setTestNow();
    }

    /* ── A5: тайлан ────────────────────────────────────────────────────── */

    public function test_daily_report_is_sent_to_admins(): void
    {
        Notification::fake();
        $admin = $this->admin();

        Call::create(['unique_id' => 'r.1', 'number_norm' => '1', 'started_at' => now(), 'is_missed' => false]);
        Call::create(['unique_id' => 'r.2', 'number_norm' => '2', 'started_at' => now(), 'is_missed' => true]);

        $this->artisan('calls:report')->assertSuccessful();

        Notification::assertSentTo($admin, CallSummaryReport::class,
            fn (CallSummaryReport $n) => $n->total === 2 && $n->missed === 1 && $n->answerRate === 50.0);
    }

    /** Дуудлага байхгүй өдөр хоосон тайлан илгээх нь зөвхөн чимээ шуугиан. */
    public function test_report_is_skipped_when_there_are_no_calls(): void
    {
        Notification::fake();
        $this->admin();

        $this->artisan('calls:report')->assertSuccessful();

        Notification::assertNothingSent();
    }

    /* ── Excel экспорт ─────────────────────────────────────────────────── */

    public function test_report_can_be_exported_to_excel(): void
    {
        Call::create(['unique_id' => 'e.1', 'number_norm' => '1', 'started_at' => now(), 'is_missed' => false]);

        $response = $this->actingAs($this->admin())->get('/admin/calls/reports/export');

        $response->assertOk();
        $this->assertStringContainsString(
            'spreadsheetml',
            (string) $response->headers->get('content-type'),
        );
    }

    public function test_reception_cannot_reach_operations_pages(): void
    {
        $user = $this->reception();

        $this->actingAs($user)->get('/admin/calls/reports')->assertRedirect();
        $this->actingAs($user)->get('/admin/calls/blocked')->assertRedirect();
    }
}
