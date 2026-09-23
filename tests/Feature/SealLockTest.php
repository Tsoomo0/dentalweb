<?php

namespace Tests\Feature;

use App\Models\HR\DocumentTemplate;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeDocument;
use App\Models\HR\Position;
use App\Models\Role;
use App\Models\User;
use App\Services\HR\SealLock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Тамга / захирлын гарын үсгийн PIN түгжээ.
 */
class SealLockTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function admin(): User
    {
        $role = Role::firstOrCreate(['name' => 'admin']);

        return User::factory()->create(['role_id' => $role->id]);
    }

    public function test_stamp_upload_is_locked_until_the_code_is_entered(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/hr/company-stamp', ['image' => self::PNG])
            ->assertStatus(423)
            ->assertJsonPath('seal_locked', true);
    }

    public function test_wrong_code_does_not_unlock(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/hr/seal/unlock', ['code' => '0000'])
            ->assertStatus(422);
    }

    public function test_correct_code_unlocks_for_the_session(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/hr/seal/unlock', ['code' => SealLock::DEFAULT_CODE])
            ->assertOk()
            ->assertJsonPath('unlocked', true);

        $this->actingAs($admin)->getJson('/hr/seal')->assertJsonPath('unlocked', true);
    }

    public function test_unlocking_lets_the_stamp_through_and_relocking_shuts_it_again(): void
    {
        Storage::fake('local');
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/hr/seal/unlock', ['code' => SealLock::DEFAULT_CODE])->assertOk();
        $this->actingAs($admin)->postJson('/hr/company-stamp', ['image' => self::PNG])->assertOk();

        $this->actingAs($admin)->postJson('/hr/seal/lock')->assertOk();
        $this->actingAs($admin)->deleteJson('/hr/company-stamp')->assertStatus(423);
    }

    public function test_hr_side_signature_library_writes_are_locked(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/hr/signatures', ['image' => self::PNG])
            ->assertStatus(423);

        // Уншихад түгжээ шаардахгүй — жагсаалт харагдана
        $this->actingAs($admin)->getJson('/hr/signatures')->assertOk();

        $this->unlockSeal()->actingAs($admin)
            ->postJson('/hr/signatures', ['image' => self::PNG])
            ->assertStatus(201);
    }

    /** Ажилтны хувийн гарын үсгийн сан түгжээгүй хэвээр — өөрийн баримтад гарын үсэг зурна. */
    public function test_personal_signature_library_stays_open(): void
    {
        $role = Role::firstOrCreate(['name' => 'employee']);
        $user = User::factory()->create(['role_id' => $role->id]);

        $this->actingAs($user)
            ->postJson('/signatures', ['image' => self::PNG])
            ->assertStatus(201);
    }

    public function test_employer_signing_is_blocked_until_unlocked(): void
    {
        Mail::fake();
        Notification::fake();

        $admin = $this->admin();
        $document = $this->draft();

        $this->actingAs($admin)->post("/hr/employee-documents/{$document->id}/sign", [
            'signature' => self::PNG,
            'employer_name' => 'Ж. Оюунбилэг',
            'employer_position' => 'Гүйцэтгэх захирал',
        ])->assertSessionHasErrors('seal');

        $this->assertSame('draft', $document->fresh()->status);
        $this->assertNull($document->fresh()->employer_signature);

        $this->unlockSeal()->actingAs($admin)->post("/hr/employee-documents/{$document->id}/sign", [
            'signature' => self::PNG,
            'employer_name' => 'Ж. Оюунбилэг',
            'employer_position' => 'Гүйцэтгэх захирал',
        ]);

        $this->assertNotNull($document->fresh()->employer_signature);
    }

    private function draft(): EmployeeDocument
    {
        $role = Role::firstOrCreate(['name' => 'employee']);
        $user = User::factory()->create(['role_id' => $role->id, 'email' => 'staff@example.com']);
        $position = Position::create(['name' => 'Шүдний техникч']);
        $employee = Employee::create([
            'user_id' => $user->id,
            'last_name' => 'Ням',
            'first_name' => 'Ганбаатар',
            'status' => 'active',
            'position_id' => $position->id,
        ]);
        $template = DocumentTemplate::create([
            'type' => 'employment',
            'title' => 'Хөдөлмөрийн гэрээ',
            'body' => '<p>Агуулга</p>',
        ]);

        return EmployeeDocument::create([
            'employee_id' => $employee->id,
            'template_id' => $template->id,
            'type' => $template->type,
            'title' => $template->title,
            'body' => '<p>Агуулга</p>',
            'status' => 'draft',
            'employee_name' => 'Н.Ганбаатар',
            'employee_position' => $position->name,
        ]);
    }
}
