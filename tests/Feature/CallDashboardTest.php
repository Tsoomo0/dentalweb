<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Дуудлагын хянах самбарын тооцоо.
 *
 * Бүх тоо SQL дотор бодогддог тул MySQL/SQLite хоёулан дээр ажиллах ёстой —
 * цаг, огноо, хугацааны функцууд драйвераас хамаардаг.
 */
class CallDashboardTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->branch = Branch::create(['name' => 'Сансар']);
    }

    private function admin(): User
    {
        return User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'admin'])->id]);
    }

    private function makeCall(array $attrs = []): Call
    {
        static $n = 0;
        $n++;

        return Call::create([
            'unique_id' => 'd.'.$n,
            'number' => '9911223'.($n % 10),
            'number_norm' => '9911223'.($n % 10),
            'direction' => 'inbound',
            'branch_id' => $this->branch->id,
            'started_at' => Carbon::today()->setTime(10, 0),
            ...$attrs,
        ]);
    }

    public function test_summary_counts_and_answer_rate(): void
    {
        $this->makeCall(['is_missed' => false, 'talk_time' => 60]);
        $this->makeCall(['is_missed' => false, 'talk_time' => 120]);
        $this->makeCall(['is_missed' => true]);
        $this->makeCall(['is_missed' => true, 'handled_at' => Carbon::today()->setTime(10, 30), 'resolution' => 'appointment_made']);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/calls/dashboard')
                ->where('summary.total', 4)
                ->where('summary.missed', 2)
                // 2 алдсанаас 1 нь шийдэгдсэн
                ->where('summary.unhandled', 1)
                ->where('summary.answer_rate', 50)
                ->where('summary.avg_talk', 90)
            );
    }

    /** Алдсанаас шийдвэрлэх хүртэлх дундаж хугацаа — драйвер бүрт өөр SQL. */
    public function test_average_handle_time_is_computed(): void
    {
        $this->makeCall([
            'is_missed' => true,
            'started_at' => Carbon::today()->setTime(9, 0),
            'handled_at' => Carbon::today()->setTime(9, 20),
        ]);
        $this->makeCall([
            'is_missed' => true,
            'started_at' => Carbon::today()->setTime(11, 0),
            'handled_at' => Carbon::today()->setTime(11, 40),
        ]);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertInertia(fn ($page) => $page->where('summary.avg_handle_minutes', 30));
    }

    /** Цагийн хуваарилалт 24 цагийг бүтнээр буцаана. */
    public function test_hourly_covers_all_24_hours(): void
    {
        $this->makeCall(['is_missed' => false, 'started_at' => Carbon::today()->setTime(14, 5)]);
        $this->makeCall(['is_missed' => true, 'started_at' => Carbon::today()->setTime(14, 50)]);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('hourly', 24)
                ->where('hourly.14.answered', 1)
                ->where('hourly.14.missed', 1)
                ->where('hourly.0.answered', 0)
            );
    }

    public function test_daily_trend_reports_answer_rate_per_day(): void
    {
        $this->makeCall(['is_missed' => false, 'started_at' => Carbon::today()->subDay()->setTime(10, 0)]);
        $this->makeCall(['is_missed' => true, 'started_at' => Carbon::today()->subDay()->setTime(11, 0)]);
        $this->makeCall(['is_missed' => false, 'started_at' => Carbon::today()->setTime(10, 0)]);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('daily', 2)
                ->where('daily.0.answer_rate', 50)
                ->where('daily.1.answer_rate', 100)
            );
    }

    /** Салбар танигдаагүй дуудлага тусдаа мөр болж харагдана. */
    public function test_branchless_calls_appear_as_their_own_row(): void
    {
        $this->makeCall(['is_missed' => true, 'branch_id' => null]);
        $this->makeCall(['is_missed' => false]);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('byBranch', 2)
                ->where('byBranch.0.branch_name', fn ($name) => in_array($name, ['Сансар', 'Салбар тодорхойгүй'], true))
            );
    }

    public function test_agent_performance_resolves_staff_name(): void
    {
        $user = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'receptionist'])->id]);
        CallExtension::create(['extension' => '505', 'branch_id' => $this->branch->id, 'user_id' => $user->id]);

        $this->makeCall(['is_missed' => false, 'agent' => '505', 'talk_time' => 100]);
        $this->makeCall(['is_missed' => false, 'agent' => '505', 'talk_time' => 200]);
        // Алдсан дуудлага ажилтны гүйцэтгэлд ОРОХГҮЙ
        $this->makeCall(['is_missed' => true, 'agent' => '505']);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('byAgent', 1)
                ->where('byAgent.0.answered', 2)
                ->where('byAgent.0.avg_talk', 150)
                ->where('byAgent.0.user_name', $user->name)
            );
    }

    /** Давтан залгаад баригдаагүй дугаар — 2-оос дээш оролдлоготой нь л орно. */
    public function test_repeat_callers_lists_only_unhandled_multiples(): void
    {
        foreach (range(1, 3) as $i) {
            Call::create([
                'unique_id' => 'r.'.$i,
                'number' => '88112233',
                'number_norm' => '88112233',
                'direction' => 'inbound',
                'branch_id' => $this->branch->id,
                'started_at' => Carbon::today()->setTime(9, $i),
                'is_missed' => true,
            ]);
        }

        // Нэг удаа л залгасан — жагсаалтад орохгүй
        $this->makeCall(['is_missed' => true, 'number_norm' => '77001122']);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('repeatCallers', 1)
                ->where('repeatCallers.0.number', '88112233')
                ->where('repeatCallers.0.attempts', 3)
            );
    }

    /** Шийдвэрлэсэн дуудлагын ангилал — цаг захиалга болсон нь гол үзүүлэлт. */
    public function test_resolution_breakdown(): void
    {
        $this->makeCall(['is_missed' => true, 'handled_at' => now(), 'resolution' => 'appointment_made']);
        $this->makeCall(['is_missed' => true, 'handled_at' => now(), 'resolution' => 'appointment_made']);
        $this->makeCall(['is_missed' => true, 'handled_at' => now(), 'resolution' => 'spam']);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard')
            ->assertInertia(function ($page) {
                $rows = collect($page->toArray()['props']['resolutions']);

                $this->assertSame(2, $rows->firstWhere('key', 'appointment_made')['total']);
                $this->assertSame(1, $rows->firstWhere('key', 'spam')['total']);
                $this->assertSame(0, $rows->firstWhere('key', 'called_back')['total']);
            });
    }

    public function test_branch_filter_narrows_every_metric(): void
    {
        $other = Branch::create(['name' => 'Яармаг']);

        $this->makeCall(['is_missed' => false]);
        $this->makeCall(['is_missed' => true, 'branch_id' => $other->id]);

        $this->actingAs($this->admin())
            ->get('/admin/calls/dashboard?branch_id='.$other->id)
            ->assertInertia(fn ($page) => $page
                ->where('summary.total', 1)
                ->where('summary.missed', 1)
                ->where('summary.answer_rate', 0)
            );
    }

    public function test_receptionist_cannot_open_dashboard(): void
    {
        $user = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'receptionist'])->id]);

        $this->actingAs($user)->get('/admin/calls/dashboard')->assertRedirect();
    }
}
