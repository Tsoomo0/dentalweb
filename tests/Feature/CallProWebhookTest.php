<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallEvent;
use App\Models\CallPro\CallExtension;
use App\Models\CallPro\CallQueue;
use App\Models\Role;
use App\Models\User;
use App\Notifications\MissedCall;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * CallPro webhook-ийн бүтэн урсгал.
 *
 * Гол шалгах зүйлс:
 *   - Нэг дуудлагын 3 event нэг мөр болж нэгдэх (unique_id-аар)
 *   - Дотуур дугаараар салбар, ажилтан тодорхойлогдох
 *   - Алдсан дуудлага илрэх (abandoned болон NO ANSWER хоёуланг)
 *   - Алдсан дуудлагад ресепшн мэдэгдэл авах, ДАВХАРДАХГҮЙ байх
 *   - Түүхэн дата мэдэгдэл үүсгэхгүй байх
 */
class CallProWebhookTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->branch = Branch::create(['name' => 'Сансар']);

        CallQueue::create(['name' => 'sansar_queue', 'branch_id' => $this->branch->id]);
    }

    private function hook(string $event, array $payload, array $query = [])
    {
        $url = '/webhooks/callpro/'.$event.($query ? '?'.http_build_query($query) : '');

        return $this->postJson($url, $payload);
    }

    private function receptionist(): User
    {
        $role = Role::firstOrCreate(['name' => 'receptionist']);

        return User::factory()->create(['role_id' => $role->id, 'branch_id' => $this->branch->id]);
    }

    public function test_three_events_merge_into_one_call(): void
    {
        $uid = '1725436801.234';

        $this->hook('start', ['unique_id' => $uid, 'number' => 99112233, 'call_date' => '2026-09-04 10:15:02', 'call_type' => 'inbound'])
            ->assertOk()->assertJson(['ok' => true]);

        $this->hook('answered', ['unique_id' => $uid, 'number' => 99112233, 'call_date' => '2026-09-04 10:15:07', 'call_type' => 'inbound', 'agent' => 101, 'call_status' => 'ANSWERED', 'call_record' => 'https://cdr.callpro.mn/records/'.$uid]);

        $this->hook('end', ['unique_id' => $uid, 'number' => 99112233, 'call_date' => '2026-09-04 10:18:44', 'call_type' => 'inbound', 'call_status' => 'ANSWERED', 'agent' => 101, 'duration' => 217]);

        $this->assertSame(1, Call::count(), '3 event нэг дуудлага болох ёстой');
        $this->assertSame(3, CallEvent::count(), 'Түүхий event бүр хадгалагдана');

        $call = Call::first();
        $this->assertSame($uid, $call->unique_id);
        $this->assertSame(217, $call->duration);
        $this->assertFalse($call->is_missed);
        $this->assertSame('2026-09-04 10:15:02', $call->started_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-09-04 10:18:44', $call->ended_at->format('Y-m-d H:i:s'));
        $this->assertNotNull($call->call_record);
    }

    public function test_extension_resolves_branch_and_staff(): void
    {
        $user = $this->receptionist();

        CallExtension::create([
            'extension' => '101',
            'branch_id' => $this->branch->id,
            'user_id' => $user->id,
        ]);

        $this->hook('answered', ['unique_id' => 'x.1', 'number' => 99112233, 'agent' => 101, 'call_status' => 'ANSWERED']);

        $call = Call::first();
        $this->assertSame($this->branch->id, $call->branch_id);
        $this->assertSame($user->id, $call->user_id);
    }

    public function test_abandoned_call_is_flagged_and_notifies_reception(): void
    {
        Notification::fake();
        $user = $this->receptionist();

        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => 'sansar_queue']);

        $call = Call::first();
        $this->assertTrue($call->is_missed);
        // Алдсан дуудлагад дотуур дугаар ирдэггүй — queue нэрээр салбар олдоно
        $this->assertSame($this->branch->id, $call->branch_id);
        $this->assertNotNull($call->missed_notified_at);

        Notification::assertSentTo($user, MissedCall::class);
    }

    public function test_no_answer_on_end_is_flagged_as_missed(): void
    {
        Notification::fake();
        $this->receptionist();

        $this->hook('end', [
            'unique_id' => 'x.3',
            'number' => 99112233,
            'call_type' => 'inbound',
            'call_status' => 'NO ANSWER',
            'duration' => 0,
        ]);

        $this->assertTrue(Call::first()->is_missed);
    }

    /** Нэг дуудлагад abandoned + end гэсэн 2 event ирж болзошгүй. */
    public function test_missed_notification_is_not_duplicated(): void
    {
        Notification::fake();
        $user = $this->receptionist();

        $this->hook('start', ['unique_id' => 'x.4', 'number' => 99112233, 'call_type' => 'inbound']);
        $this->hook('abandoned', ['number' => 99112233, 'queue_name' => 'sansar_queue']);
        $this->hook('end', ['unique_id' => 'x.4', 'number' => 99112233, 'call_type' => 'inbound', 'call_status' => 'NO ANSWER', 'duration' => 0]);

        $this->assertSame(1, Call::count(), 'abandoned нь өмнөх дуудлагатай нэгдэх ёстой');
        Notification::assertSentToTimes($user, MissedCall::class, 1);
    }

    /** 6 сарын түүхэн дата оруулахад мянган мэдэгдэл үүсэж болохгүй. */
    public function test_backfill_does_not_notify(): void
    {
        Notification::fake();
        $this->receptionist();

        $this->hook('end', [
            'unique_id' => 'old.1',
            'number' => 99112233,
            'call_type' => 'inbound',
            'call_status' => 'NO ANSWER',
            'call_date' => now()->subMonths(3)->format('Y-m-d H:i:s'),
            'duration' => 0,
        ], ['source' => 'history']);

        $call = Call::first();
        $this->assertTrue($call->is_missed);
        $this->assertSame('backfill', $call->source);
        $this->assertNull($call->missed_notified_at);

        Notification::assertNothingSent();
    }

    /** Түүхэн датаны талбарын нэр өөр ирдэг (Voice-history-parameters.pdf). */
    public function test_voice_history_field_names_are_accepted(): void
    {
        $this->hook('end', [
            'Unique ID' => 'hist.9',
            'Date' => '2026-03-01 09:04:11',
            'Dir' => 'inbound',
            'Caller ID number' => 99887766,
            'Disposition' => 'ANSWERED',
            'Duration' => 65,
            'Who answered' => 102,
        ], ['source' => 'history']);

        $call = Call::first();
        $this->assertSame('hist.9', $call->unique_id);
        $this->assertSame('99887766', $call->number_norm);
        $this->assertSame(65, $call->duration);
        $this->assertSame('102', $call->agent);
    }

    /** Түлхүүр тохируулсан үед буруу түлхүүртэй хүсэлт орж ирэхгүй. */
    public function test_invalid_token_is_rejected(): void
    {
        config(['services.callpro.webhook_token' => 'secret-token']);

        $this->hook('start', ['unique_id' => 'x.9', 'number' => 99112233])
            ->assertStatus(401);

        $this->assertSame(0, CallEvent::count());

        $this->withHeader('X-Callpro-Token', 'secret-token')
            ->hook('start', ['unique_id' => 'x.9', 'number' => 99112233])
            ->assertOk();

        $this->assertSame(1, CallEvent::count());
    }

    /**
     * IP шүүлтүүр нь proxy-гийн ард жинхэнэ үйлчлүүлэгчийн IP-г уншина.
     *
     * Cloudflare / load balancer орвол REMOTE_ADDR нь proxy-гийнх болж,
     * CallPro-гийн жинхэнэ хаяг X-Forwarded-For дотор ирнэ. TRUSTED_PROXIES
     * (config/trustedproxy.php) тохируулаагүй бол БҮХ webhook 403 болно —
     * энэ тест тэр алдааг эргэж орохоос сэргийлнэ.
     */
    public function test_ip_whitelist_reads_the_real_client_ip_behind_a_proxy(): void
    {
        config([
            'services.callpro.webhook_token' => '',
            'services.callpro.allowed_ips' => ['202.37.235.42'],
        ]);

        $payload = ['unique_id' => 'proxy.1', 'number' => 99112233];

        // Proxy-д итгээгүй үед — proxy-ийн IP тулгалдаж хаагдана
        config(['trustedproxy.proxies' => null]);

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.5'])
            ->withHeader('X-Forwarded-For', '202.37.235.42')
            ->hook('start', $payload)
            ->assertStatus(403);

        $this->assertSame(0, CallEvent::count());

        // TRUSTED_PROXIES=* үед — X-Forwarded-For-оос жинхэнэ IP уншина
        config(['trustedproxy.proxies' => '*']);

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.5'])
            ->withHeader('X-Forwarded-For', '202.37.235.42')
            ->hook('start', $payload)
            ->assertOk();

        $this->assertSame(1, CallEvent::count());
    }
}
