<?php

namespace Tests\Feature;

use App\Models\HR\DocumentTemplate;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeDocument;
use App\Models\HR\Position;
use App\Models\Role;
use App\Models\User;
use App\Services\HR\CompanyStamp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Байгууллагын тамга — нэг удаа оруулаад гэрээ бүрд дарагдана.
 */
class CompanyStampTest extends TestCase
{
    use RefreshDatabase;

    /** 1x1 PNG. */
    private const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function admin(): User
    {
        $role = Role::firstOrCreate(['name' => 'admin']);

        return User::factory()->create(['role_id' => $role->id, 'email' => 'director@example.com']);
    }

    public function test_stamp_can_be_uploaded_read_back_and_removed(): void
    {
        Storage::fake(CompanyStamp::DISK);
        $admin = $this->admin();

        $this->actingAs($admin)->getJson('/hr/company-stamp')->assertOk()->assertJsonPath('has_stamp', false);

        $this->unlockSeal()->actingAs($admin)
            ->postJson('/hr/company-stamp', ['image' => self::PNG])
            ->assertOk()
            ->assertJsonPath('has_stamp', true);

        Storage::disk(CompanyStamp::DISK)->assertExists(CompanyStamp::PATH);
        $this->actingAs($admin)->getJson('/hr/company-stamp')->assertJsonPath('has_stamp', true);

        $this->actingAs($admin)->deleteJson('/hr/company-stamp')->assertOk()->assertJsonPath('has_stamp', false);
        Storage::disk(CompanyStamp::DISK)->assertMissing(CompanyStamp::PATH);
    }

    public function test_non_png_payloads_are_rejected(): void
    {
        Storage::fake(CompanyStamp::DISK);

        $this->unlockSeal()->actingAs($this->admin())
            ->postJson('/hr/company-stamp', ['image' => 'data:text/html;base64,PHNjcmlwdD4='])
            ->assertStatus(422);

        $this->assertFalse(CompanyStamp::exists());
    }

    public function test_stamp_is_copied_onto_the_document_when_the_employer_signs(): void
    {
        Storage::fake(CompanyStamp::DISK);
        Mail::fake();
        Notification::fake();

        $admin = $this->admin();
        $this->unlockSeal()->actingAs($admin)->postJson('/hr/company-stamp', ['image' => self::PNG])->assertOk();

        $document = $this->draft();

        $this->actingAs($admin)->post("/hr/employee-documents/{$document->id}/sign", [
            'signature' => self::PNG,
            'employer_name' => 'Ж. Оюунбилэг',
            'employer_position' => 'Гүйцэтгэх захирал',
            'apply_stamp' => true,
        ]);

        $this->assertNotNull($document->fresh()->employer_stamp);

        // Тамга солигдсон ч баталгаажсан гэрээн дэх хуулбар хэвээр үлдэнэ
        $snapshot = $document->fresh()->employer_stamp;
        CompanyStamp::remove();
        $this->assertSame($snapshot, $document->fresh()->employer_stamp);
    }

    public function test_employer_can_sign_without_applying_the_stamp(): void
    {
        Storage::fake(CompanyStamp::DISK);
        Mail::fake();
        Notification::fake();

        $admin = $this->admin();
        $this->unlockSeal()->actingAs($admin)->postJson('/hr/company-stamp', ['image' => self::PNG]);

        $document = $this->draft();

        $this->actingAs($admin)->post("/hr/employee-documents/{$document->id}/sign", [
            'signature' => self::PNG,
            'employer_name' => 'Ж. Оюунбилэг',
            'employer_position' => 'Гүйцэтгэх захирал',
            'apply_stamp' => false,
        ]);

        $this->assertNull($document->fresh()->employer_stamp);
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
