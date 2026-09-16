<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\UserSignature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Хадгалсан гарын үсгийн сан — нэг удаа хадгалаад бусад баримтад дахин ашиглана.
 */
class UserSignatureTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function user(string $email = 'staff@example.com'): User
    {
        $role = Role::firstOrCreate(['name' => 'employee']);

        return User::factory()->create(['role_id' => $role->id, 'email' => $email]);
    }

    public function test_first_saved_signature_becomes_the_default(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->postJson('/signatures', ['image' => self::PNG, 'label' => 'Үндсэн', 'source' => 'upload'])
            ->assertCreated()
            ->assertJsonPath('signature.is_default', true)
            ->assertJsonPath('signature.source', 'upload');

        $this->assertSame(1, UserSignature::where('user_id', $user->id)->count());
    }

    public function test_saved_signatures_are_listed_default_first(): void
    {
        $user = $this->user();

        $first = UserSignature::create(['user_id' => $user->id, 'image' => self::PNG, 'is_default' => false]);
        $second = UserSignature::create(['user_id' => $user->id, 'image' => self::PNG, 'is_default' => true]);

        $response = $this->actingAs($user)->getJson('/signatures')->assertOk();

        $ids = array_column($response->json('signatures'), 'id');
        $this->assertSame([$second->id, $first->id], $ids);
    }

    public function test_setting_a_new_default_clears_the_previous_one(): void
    {
        $user = $this->user();
        $old = UserSignature::create(['user_id' => $user->id, 'image' => self::PNG, 'is_default' => true]);
        $new = UserSignature::create(['user_id' => $user->id, 'image' => self::PNG, 'is_default' => false]);

        $this->actingAs($user)->patchJson("/signatures/{$new->id}/default")->assertOk();

        $this->assertFalse($old->fresh()->is_default);
        $this->assertTrue($new->fresh()->is_default);
    }

    public function test_deleting_the_default_promotes_another_signature(): void
    {
        $user = $this->user();
        $other = UserSignature::create(['user_id' => $user->id, 'image' => self::PNG, 'is_default' => false]);
        $default = UserSignature::create(['user_id' => $user->id, 'image' => self::PNG, 'is_default' => true]);

        $this->actingAs($user)->deleteJson("/signatures/{$default->id}")->assertOk();

        $this->assertNull(UserSignature::find($default->id));
        $this->assertTrue($other->fresh()->is_default);
    }

    public function test_a_user_cannot_touch_another_users_signature(): void
    {
        $owner = $this->user('owner@example.com');
        $intruder = $this->user('intruder@example.com');
        $signature = UserSignature::create(['user_id' => $owner->id, 'image' => self::PNG]);

        $this->actingAs($intruder)->deleteJson("/signatures/{$signature->id}")->assertForbidden();
        $this->actingAs($intruder)->patchJson("/signatures/{$signature->id}/default")->assertForbidden();

        $this->assertNotNull(UserSignature::find($signature->id));
    }

    public function test_only_image_data_urls_are_accepted(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->postJson('/signatures', ['image' => '<script>alert(1)</script>'])
            ->assertStatus(422);

        $this->actingAs($user)
            ->postJson('/signatures', ['image' => 'data:text/html;base64,PHNjcmlwdD4='])
            ->assertStatus(422);

        $this->assertSame(0, UserSignature::count());
    }

    public function test_saved_signature_count_is_capped(): void
    {
        $user = $this->user();

        for ($i = 0; $i < UserSignature::MAX_PER_USER; $i++) {
            UserSignature::create(['user_id' => $user->id, 'image' => self::PNG]);
        }

        $this->actingAs($user)
            ->postJson('/signatures', ['image' => self::PNG])
            ->assertStatus(422);

        $this->assertSame(UserSignature::MAX_PER_USER, UserSignature::where('user_id', $user->id)->count());
    }

    public function test_guests_cannot_reach_the_signature_library(): void
    {
        $this->getJson('/signatures')->assertStatus(302);
        $this->postJson('/signatures', ['image' => self::PNG])->assertStatus(302);
    }
}
