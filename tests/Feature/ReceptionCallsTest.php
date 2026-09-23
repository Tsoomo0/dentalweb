<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use App\Models\Role;
use App\Models\User;
use App\Notifications\MissedCall;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Ресепшний дуудлагын хуудас.
 *
 * Гол шалгах зүйл нь ХИЛ: ресепшн зөвхөн өөрийн салбарын дуудлага харах,
 * бусад салбарынхыг харах ч, тэмдэглэх ч боломжгүй байх ёстой.
 */
class ReceptionCallsTest extends TestCase
{
    use RefreshDatabase;

    private Branch $sansar;

    private Branch $yarmag;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sansar = Branch::create(['name' => 'Сансар']);
        $this->yarmag = Branch::create(['name' => 'Яармаг']);
    }

    /**
     * `is_active`-ийг ЗААВАЛ шууд өгнө.
     *
     * Factory-гийн буцаадаг instance дээр мэдээллийн сангийн анхны утга
     * ачаалагддаггүй тул `is_active` нь null болж, ReceptionMiddleware
     * хэрэглэгчийг идэвхгүй гэж үзээд гаргачихдаг.
     */
    private function reception(?Branch $branch = null): User
    {
        return User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'receptionist'])->id,
            'branch_id' => ($branch ?? $this->sansar)->id,
            'is_active' => true,
        ]);
    }

    private function makeCall(array $attrs = []): Call
    {
        static $n = 0;
        $n++;

        return Call::create([
            'unique_id' => 'rc.'.$n,
            'number' => '9911223'.($n % 10),
            'number_norm' => '9911223'.($n % 10),
            'direction' => 'inbound',
            'branch_id' => $this->sansar->id,
            'started_at' => Carbon::now()->subMinutes(10),
            ...$attrs,
        ]);
    }

    /** Мэдэгдэл дээр дарахад буудаг хаяг ажиллах ёстой. */
    public function test_reception_can_open_the_calls_page(): void
    {
        $this->makeCall(['is_missed' => true]);

        $this->actingAs($this->reception())
            ->get('/reception/calls?missed=1')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('reception/calls/index')
                ->where('branchName', 'Сансар')
                ->has('calls.data', 1)
            );
    }

    /** Анхдагч харагдац нь шийдвэрлэх ёстой дуудлагууд. */
    public function test_default_view_shows_only_unhandled_missed(): void
    {
        $this->makeCall(['is_missed' => true]);                               // орно
        $this->makeCall(['is_missed' => true, 'handled_at' => now(), 'resolution' => 'called_back']); // орохгүй
        $this->makeCall(['is_missed' => false]);                              // орохгүй
        $this->makeCall(['is_missed' => true, 'is_spam' => true]);            // орохгүй

        $this->actingAs($this->reception())
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page
                ->where('filters.view', 'todo')
                ->has('calls.data', 1)
                ->where('stats.todo', 1)
            );
    }

    public function test_other_branch_calls_are_never_listed(): void
    {
        $this->makeCall(['is_missed' => true, 'branch_id' => $this->yarmag->id]);
        // Салбар нь тодорхойгүй дуудлага бол зөвхөн админы асуудал
        $this->makeCall(['is_missed' => true, 'branch_id' => null]);

        $this->actingAs($this->reception())
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page->has('calls.data', 0));
    }

    /** URL-аар өөр салбарын дуудлагыг тэмдэглэх боломжгүй. */
    public function test_reception_cannot_resolve_another_branch_call(): void
    {
        $foreign = $this->makeCall(['is_missed' => true, 'branch_id' => $this->yarmag->id]);

        $this->actingAs($this->reception())
            ->patch("/reception/calls/{$foreign->id}/resolve", ['resolution' => 'called_back'])
            ->assertForbidden();

        $this->assertNull($foreign->fresh()->handled_at);
    }

    public function test_reception_cannot_resolve_branchless_call(): void
    {
        $orphan = $this->makeCall(['is_missed' => true, 'branch_id' => null]);

        $this->actingAs($this->reception())
            ->patch("/reception/calls/{$orphan->id}/resolve", ['resolution' => 'called_back'])
            ->assertForbidden();
    }

    public function test_reception_can_resolve_and_revert_own_call(): void
    {
        $user = $this->reception();
        $call = $this->makeCall(['is_missed' => true]);

        $this->actingAs($user)
            ->patch("/reception/calls/{$call->id}/resolve", [
                'resolution' => 'appointment_made',
                'resolution_note' => 'Маргааш 14:00 цагт ирнэ.',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $call->refresh();
        $this->assertSame('appointment_made', $call->resolution);
        $this->assertSame($user->id, $call->handled_by);
        $this->assertNotNull($call->handled_at);

        $this->actingAs($user)->patch("/reception/calls/{$call->id}/unresolve")->assertRedirect();

        $this->assertNull($call->fresh()->handled_at);
    }

    public function test_invalid_resolution_is_rejected(): void
    {
        $call = $this->makeCall(['is_missed' => true]);

        $this->actingAs($this->reception())
            ->patch("/reception/calls/{$call->id}/resolve", ['resolution' => 'хамаагүй'])
            ->assertSessionHasErrors('resolution');
    }

    /**
     * Хуучин барьж амжаагүй дуудлага огнооны шүүлтээс болж далд үлдэх ёсгүй.
     */
    public function test_todo_view_ignores_the_date_range(): void
    {
        $this->makeCall(['is_missed' => true, 'started_at' => Carbon::now()->subDays(20)]);

        $this->actingAs($this->reception())
            ->get('/reception/calls?from='.Carbon::today()->toDateString().'&to='.Carbon::today()->toDateString())
            ->assertInertia(fn ($page) => $page->has('calls.data', 1));
    }

    /** «Бүгд» харагдац дээр огнооны шүүлт ажиллана. */
    public function test_all_view_respects_the_date_range(): void
    {
        $this->makeCall(['is_missed' => false, 'started_at' => Carbon::now()->subDays(20)]);

        $this->actingAs($this->reception())
            ->get('/reception/calls?view=all&from='.Carbon::today()->toDateString().'&to='.Carbon::today()->toDateString())
            ->assertInertia(fn ($page) => $page->has('calls.data', 0));
    }

    public function test_poll_returns_live_counts(): void
    {
        $this->makeCall(['is_missed' => true]);
        $this->makeCall(['is_missed' => false]);

        $this->actingAs($this->reception())
            ->getJson('/reception/calls/poll')
            ->assertOk()
            ->assertJson(['todo' => 1, 'today_total' => 2, 'today_missed' => 1, 'today_answer_rate' => 50]);
    }

    /** Салбаргүй ажилтанд бусад салбарын дата алдагдаж болохгүй. */
    public function test_branchless_staff_sees_nothing(): void
    {
        $this->makeCall(['is_missed' => true]);

        $user = User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'receptionist'])->id,
            'branch_id' => null,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page->has('calls.data', 0)->where('stats.todo', 0));
    }

    /**
     * Админ бол мөн staff тул ресепшний хуудсыг нээж чадна (middleware-ийн
     * дүрэм). Гэхдээ салбаргүй бол юу ч харагдахгүй — бүх салбарын дата
     * задарч болохгүй.
     */
    public function test_admin_without_branch_sees_nothing_here(): void
    {
        $this->makeCall(['is_missed' => true]);

        $admin = User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'admin'])->id,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->get('/reception/calls')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('calls.data', 0));
    }

    /* ── Өөрийн дотуур дугаар ──────────────────────────────────────────── */

    public function test_own_extension_and_today_count_are_shown(): void
    {
        $user = $this->reception();

        CallExtension::create([
            'extension' => '100',
            'branch_id' => $this->sansar->id,
            'user_id' => $user->id,
            'label' => 'Цолмон',
        ]);

        $this->makeCall(['is_missed' => false, 'agent' => '100']);
        $this->makeCall(['is_missed' => false, 'agent' => '100']);
        // Өөр хүний дугаараар хариулсан — тоонд орохгүй
        $this->makeCall(['is_missed' => false, 'agent' => '101']);

        $this->actingAs($user)
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page
                ->has('me.extensions', 1)
                ->where('me.extensions.0.extension', '100')
                ->where('me.extensions.0.branch_mismatch', false)
                ->where('me.answered_today', 2)
            );
    }

    /** «Миний» харагдац — зөвхөн өөрийн дугаараар хариулсан дуудлага. */
    public function test_mine_view_filters_by_own_extension(): void
    {
        $user = $this->reception();
        CallExtension::create(['extension' => '100', 'branch_id' => $this->sansar->id, 'user_id' => $user->id]);

        $this->makeCall(['is_missed' => false, 'agent' => '100']);
        $this->makeCall(['is_missed' => false, 'agent' => '506']);

        $this->actingAs($user)
            ->get('/reception/calls?view=mine')
            ->assertInertia(fn ($page) => $page
                ->has('calls.data', 1)
                ->where('calls.data.0.agent', '100')
            );
    }

    /** Дугаар холбоогүй ажилтанд «Миний» жагсаалт хоосон байна. */
    public function test_mine_view_is_empty_without_an_extension(): void
    {
        $this->makeCall(['is_missed' => false, 'agent' => '100']);

        $this->actingAs($this->reception())
            ->get('/reception/calls?view=mine')
            ->assertInertia(fn ($page) => $page
                ->has('calls.data', 0)
                ->has('me.extensions', 0)
            );
    }

    /** Дугаар өөр салбарт бүртгэгдсэн бол ажилтанд анхааруулна. */
    public function test_branch_mismatch_is_flagged(): void
    {
        $user = $this->reception();
        CallExtension::create(['extension' => '505', 'branch_id' => $this->yarmag->id, 'user_id' => $user->id]);

        $this->actingAs($user)
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page->where('me.extensions.0.branch_mismatch', true));
    }

    /**
     * Ресепшний хуудсууд дээр мэдэгдлийг цагаан жагсаалтаар шүүдэг тул
     * MissedCall тэр жагсаалтад заавал байх ёстой — үгүй бол алдсан
     * дуудлагын мэдэгдэл хонхон дээр ХЭЗЭЭ Ч харагдахгүй.
     */
    public function test_missed_call_notification_reaches_the_reception_bell(): void
    {
        $user = $this->reception();

        $user->notify(new MissedCall(
            callId: 1,
            number: '99112233',
            branchName: 'Сансар',
            queueName: null,
            calledAt: now()->format('Y-m-d H:i'),
            repeatCount: 1,
        ));

        $this->actingAs($user)
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page
                ->where('notifications.unread_count', 1)
                ->has('notifications.items', 1)
                ->where('notifications.items.0.notif_type', 'MissedCall')
            );
    }

    /* ── Хуудаслалт ────────────────────────────────────────────────────── */

    public function test_list_is_paginated_with_meta(): void
    {
        foreach (range(1, 30) as $i) {
            $this->makeCall(['is_missed' => true]);
        }

        $this->actingAs($this->reception())
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page
                ->has('calls.data', 10)
                ->where('calls.total', 30)
                ->where('calls.per_page', 10)
                ->where('calls.current_page', 1)
                ->where('calls.last_page', 3)
                ->where('calls.from', 1)
                ->where('calls.to', 10)
            );
    }

    public function test_second_page_returns_the_rest(): void
    {
        foreach (range(1, 25) as $i) {
            $this->makeCall(['is_missed' => true]);
        }

        // 25 бичлэг, хуудсанд 10 → сүүлийн хуудсанд 5 үлдэнэ
        $this->actingAs($this->reception())
            ->get('/reception/calls?page=3')
            ->assertInertia(fn ($page) => $page
                ->has('calls.data', 5)
                ->where('calls.current_page', 3)
            );
    }

    public function test_per_page_can_be_changed(): void
    {
        foreach (range(1, 30) as $i) {
            $this->makeCall(['is_missed' => true]);
        }

        $this->actingAs($this->reception())
            ->get('/reception/calls?per_page=50')
            ->assertInertia(fn ($page) => $page
                ->has('calls.data', 30)
                ->where('calls.last_page', 1)
            );
    }

    /** ?per_page=100000 гэж бичээд серверийг унагаах боломжгүй байх ёстой. */
    public function test_absurd_per_page_falls_back_to_the_default(): void
    {
        $this->makeCall(['is_missed' => true]);

        $this->actingAs($this->reception())
            ->get('/reception/calls?per_page=100000')
            ->assertInertia(fn ($page) => $page->where('calls.per_page', 10));
    }

    /** Sidebar badge — эргэж холбогдоогүй дуудлагын тоо. */
    public function test_sidebar_badge_counts_own_branch_only(): void
    {
        $this->makeCall(['is_missed' => true]);
        $this->makeCall(['is_missed' => true, 'branch_id' => $this->yarmag->id]);

        $this->actingAs($this->reception())
            ->get('/reception/calls')
            ->assertInertia(fn ($page) => $page->where('pending_missed_calls', 1));
    }

    /* ── Салбаргүй дуудлага ──────────────────────────────── */

    /**
     * IVR дээр товч дарж амжаагүй дуудлага бүх салбарт НЭГ ижил харагдана.
     *
     * Өмнө нь ийм дуудлага зөвхөн админд харагдаж, практикт хэн ч эргэж
     * залгадаггүй байв.
     */
    public function test_unassigned_view_shows_branchless_missed_calls(): void
    {
        $this->makeCall(['is_missed' => true, 'branch_id' => null]);
        $this->makeCall(['is_missed' => true]);                              // Сансарынх
        $this->makeCall(['is_missed' => true, 'branch_id' => $this->yarmag->id]);

        foreach ([$this->sansar, $this->yarmag] as $branch) {
            $this->actingAs($this->reception($branch))
                ->get('/reception/calls?view=unassigned')
                ->assertInertia(fn ($page) => $page
                    ->has('calls.data', 1)
                    ->where('calls.data.0.is_unassigned', true)
                    ->where('stats.unassigned', 1)
                );
        }
    }

    /** Шийдэгдсэн салбаргүй дуудлага жагсаалтаас хасагдана. */
    public function test_unassigned_view_hides_handled_calls(): void
    {
        $this->makeCall([
            'is_missed' => true,
            'branch_id' => null,
            'handled_at' => Carbon::now(),
        ]);

        $this->actingAs($this->reception())
            ->get('/reception/calls?view=unassigned')
            ->assertInertia(fn ($page) => $page->has('calls.data', 0));
    }

    /** «Би авлаа» — дуудлага хариуцагчийн салбарт шилжинэ. */
    public function test_reception_can_claim_a_branchless_call(): void
    {
        $call = $this->makeCall(['is_missed' => true, 'branch_id' => null]);

        $this->actingAs($this->reception($this->yarmag))
            ->patch("/reception/calls/{$call->id}/claim")
            ->assertRedirect();

        $this->assertSame($this->yarmag->id, $call->fresh()->branch_id);
    }

    /**
     * Хоёр ресепшн зэрэг дарвал хоёр дахь нь татгалзана — эс бөгөөс дуудлага
     * эзэн солигдож, эхнийх нь залгаж байхад нөгөө салбарын жагсаалтад орно.
     */
    public function test_claiming_an_already_claimed_call_is_rejected(): void
    {
        $call = $this->makeCall(['is_missed' => true, 'branch_id' => null]);

        $this->actingAs($this->reception($this->sansar))
            ->patch("/reception/calls/{$call->id}/claim")
            ->assertRedirect();

        $this->actingAs($this->reception($this->yarmag))
            ->patch("/reception/calls/{$call->id}/claim")
            ->assertStatus(409);

        $this->assertSame($this->sansar->id, $call->fresh()->branch_id);
    }

    /** Салбаргүй ажилтан хариуцаж чадахгүй — дуудлага хаашаа ч очихгүй. */
    public function test_branchless_staff_cannot_claim(): void
    {
        $call = $this->makeCall(['is_missed' => true, 'branch_id' => null]);

        $user = User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'receptionist'])->id,
            'branch_id' => null,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->patch("/reception/calls/{$call->id}/claim")
            ->assertStatus(403);

        $this->assertNull($call->fresh()->branch_id);
    }
}
