<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Салбарыг нийтийн сайт / онлайн цаг захиалгад харуулах эсэхийг админ тохируулна.
 */
class BranchVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function admin(): User
    {
        return User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'admin'])->id]);
    }

    /** @return list<string> */
    private function branchNames(string $url): array
    {
        return collect($this->get($url)->assertOk()->viewData('page')['props']['branches'])->pluck('name')->all();
    }

    public function test_only_active_public_branches_appear_on_the_public_site(): void
    {
        Branch::create(['name' => 'Сансар', 'is_active' => true, 'is_public' => true, 'order' => 1]);
        Branch::create(['name' => 'Төв оффис', 'is_active' => true, 'is_public' => false, 'order' => 2]);
        Branch::create(['name' => 'Хаагдсан', 'is_active' => false, 'is_public' => true, 'order' => 3]);

        $this->assertSame(['Сансар'], $this->branchNames('/about'));
        $this->assertSame(['Сансар'], $this->branchNames('/booking'));
    }

    public function test_admin_toggles_visibility_from_the_list_and_the_form(): void
    {
        $admin = $this->admin();
        $branch = Branch::create(['name' => 'Хороолол', 'is_active' => true, 'order' => 1]);
        $this->assertTrue($branch->fresh()->is_public, 'Шинэ салбар анхнаасаа нийтэд харагдана');

        $this->actingAs($admin)->patch("/admin/branches/{$branch->id}/visibility")->assertSessionHas('success');
        $this->assertFalse($branch->fresh()->is_public);
        $this->assertSame([], $this->branchNames('/about'));

        $this->actingAs($admin)->put("/admin/branches/{$branch->id}", [
            'name' => 'Хороолол', 'is_active' => true, 'is_public' => true, 'is_featured' => false,
        ])->assertRedirect('/admin/branches');
        $this->assertTrue($branch->fresh()->is_public);

        $this->actingAs(User::factory()->create())->patch("/admin/branches/{$branch->id}/visibility");
        $this->assertTrue($branch->fresh()->is_public, 'Админ биш хэрэглэгч өөрчлөх эрхгүй');
    }
}
