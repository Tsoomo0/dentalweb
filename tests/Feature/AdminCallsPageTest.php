<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use App\Models\CallPro\CallQueue;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Админ талын дуудлагын хуудсууд — ачаалалт, эрх, тохиргооны хадгалалт.
 */
class AdminCallsPageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'admin'])->id]);
    }

    private function branch(string $name = 'Сансар'): Branch
    {
        return Branch::create(['name' => $name]);
    }

    public function test_admin_can_open_call_log(): void
    {
        $branch = $this->branch();

        Call::create([
            'unique_id' => 'a.1',
            'number' => '99112233',
            'number_norm' => '99112233',
            'direction' => 'inbound',
            'call_status' => 'NO ANSWER',
            'branch_id' => $branch->id,
            'started_at' => now(),
            'is_missed' => true,
        ]);

        $this->actingAs($this->admin())
            ->get('/admin/calls')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/calls/index')
                ->has('calls.data', 1)
                ->where('stats.missed', 1)
                ->where('stats.unhandled', 1)
                ->where('stats.answer_rate', 0)
            );
    }

    public function test_admin_can_open_settings_and_sees_unmapped_values(): void
    {
        $this->branch();

        // Бүртгэгдээгүй дотуур дугаар болон queue-тэй дуудлага
        Call::create([
            'unique_id' => 'a.2',
            'number' => '99112233',
            'direction' => 'inbound',
            'agent' => '1042',
            'queue_name' => 'unknown_queue',
            'started_at' => now(),
        ]);

        $this->actingAs($this->admin())
            ->get('/admin/call-settings')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/calls/settings')
                ->has('unmappedAgents', 1)
                ->where('unmappedAgents.0.agent', '1042')
                ->has('unmappedQueues', 1)
                ->where('unmappedQueues.0.queue_name', 'unknown_queue')
            );
    }

    public function test_extension_can_be_created_and_removed_from_unmapped(): void
    {
        $branch = $this->branch();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post('/admin/call-settings/extensions', [
                'extension' => '101',
                'branch_id' => $branch->id,
                'label' => 'Ресепшн 1',
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('call_extensions', [
            'extension' => '101',
            'branch_id' => $branch->id,
        ]);

        // Бүртгэсэн дугаар "танигдаагүй" жагсаалтаас алга болно
        Call::create(['unique_id' => 'a.3', 'number' => '99112233', 'agent' => '101', 'started_at' => now()]);

        $this->actingAs($admin)
            ->get('/admin/call-settings')
            ->assertInertia(fn ($page) => $page->has('unmappedAgents', 0));
    }

    public function test_queue_can_be_created_with_and_without_branch(): void
    {
        $branch = $this->branch();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post('/admin/call-settings/queues', ['name' => '1', 'branch_id' => $branch->id])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        // Салбаргүй queue — Мэдээлэл авах мэт бүх салбарт хамаарах дараалал
        $this->actingAs($admin)
            ->post('/admin/call-settings/queues', ['name' => '0', 'label' => 'Мэдээлэл авах'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertSame($branch->id, CallQueue::where('name', '1')->value('branch_id'));
        $this->assertNull(CallQueue::where('name', '0')->value('branch_id'));
    }

    /** Зориуд салбаргүй болгосон queue "бүртгэгдээгүй" анхааруулгад орохгүй. */
    public function test_registered_shared_queue_is_not_reported_as_unmapped(): void
    {
        CallQueue::create(['name' => '0', 'branch_id' => null]);

        Call::create([
            'unique_id' => 'q.1',
            'number' => '99112233',
            'queue_name' => '0',
            'started_at' => now(),
        ]);

        $this->actingAs($this->admin())
            ->get('/admin/call-settings')
            ->assertInertia(fn ($page) => $page->has('unmappedQueues', 0));
    }

    public function test_duplicate_queue_is_rejected(): void
    {
        CallQueue::create(['name' => '2', 'branch_id' => $this->branch()->id]);

        $this->actingAs($this->admin())
            ->post('/admin/call-settings/queues', ['name' => '2'])
            ->assertSessionHasErrors('name');
    }

    public function test_missed_call_can_be_resolved_and_reverted(): void
    {
        $admin = $this->admin();
        $call = Call::create([
            'unique_id' => 'a.4',
            'number' => '99112233',
            'direction' => 'inbound',
            'started_at' => now(),
            'is_missed' => true,
        ]);

        $this->actingAs($admin)
            ->patch("/admin/calls/{$call->id}/resolve", [
                'resolution' => 'appointment_made',
                'resolution_note' => 'Маргааш 14:00 цагт ирнэ.',
            ])
            ->assertRedirect();

        $call->refresh();
        $this->assertSame('appointment_made', $call->resolution);
        $this->assertSame($admin->id, $call->handled_by);
        $this->assertNotNull($call->handled_at);

        $this->actingAs($admin)->patch("/admin/calls/{$call->id}/unresolve")->assertRedirect();

        $call->refresh();
        $this->assertNull($call->resolution);
        $this->assertNull($call->handled_at);
    }

    public function test_invalid_resolution_is_rejected(): void
    {
        $call = Call::create(['unique_id' => 'a.5', 'number' => '99112233', 'started_at' => now(), 'is_missed' => true]);

        $this->actingAs($this->admin())
            ->patch("/admin/calls/{$call->id}/resolve", ['resolution' => 'хамаагүй утга'])
            ->assertSessionHasErrors('resolution');
    }

    public function test_call_log_is_paginated(): void
    {
        $branch = $this->branch();

        foreach (range(1, 25) as $i) {
            Call::create([
                'unique_id' => 'p.'.$i,
                'number' => '99112233',
                'number_norm' => '99112233',
                'direction' => 'inbound',
                'branch_id' => $branch->id,
                'started_at' => now(),
            ]);
        }

        $this->actingAs($this->admin())
            ->get('/admin/calls')
            ->assertInertia(fn ($page) => $page
                ->has('calls.data', 10)
                ->where('calls.total', 25)
                ->where('calls.per_page', 10)
                ->where('calls.last_page', 3)
            );
    }

    public function test_admin_per_page_is_clamped(): void
    {
        Call::create([
            'unique_id' => 'p.x',
            'number' => '99112233',
            'started_at' => now(),
            'branch_id' => $this->branch()->id,
        ]);

        $this->actingAs($this->admin())
            ->get('/admin/calls?per_page=99999')
            ->assertInertia(fn ($page) => $page->where('calls.per_page', 10));
    }

    public function test_receptionist_cannot_reach_admin_pages(): void
    {
        $user = User::factory()->create([
            'role_id' => Role::firstOrCreate(['name' => 'receptionist'])->id,
        ]);

        $this->actingAs($user)->get('/admin/calls')->assertRedirect();
        $this->actingAs($user)->get('/admin/call-settings')->assertRedirect();
    }

    public function test_duplicate_extension_is_rejected(): void
    {
        $branch = $this->branch();
        CallExtension::create(['extension' => '101', 'branch_id' => $branch->id]);

        $this->actingAs($this->admin())
            ->post('/admin/call-settings/extensions', ['extension' => '101', 'branch_id' => $branch->id])
            ->assertSessionHasErrors('extension');
    }
}
