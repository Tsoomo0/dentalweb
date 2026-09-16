<?php

namespace Tests\Feature;

use App\Mail\EmployeeDocumentCompletedMail;
use App\Models\HR\DocumentTemplate;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeDocument;
use App\Models\HR\Position;
use App\Models\Role;
use App\Models\User;
use App\Notifications\EmployeeDocumentDeclined;
use App\Notifications\EmployeeDocumentSent;
use App\Notifications\EmployeeDocumentSigned;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Гэрээний бүрэн урсгал: загвараас гэрээ үүсгэх → захирал гарын үсэг зурах
 * → ажилтан гарын үсэг зурах → баталгаажиж 2 талд и-мэйл очих.
 */
class EmployeeDocumentSigningTest extends TestCase
{
    use RefreshDatabase;

    /** 1x1 хэмжээтэй хоосон PNG — гарын үсгийн оронд ашиглана. */
    private const SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function hrUser(): User
    {
        $role = Role::firstOrCreate(['name' => 'admin']);

        return User::factory()->create(['role_id' => $role->id, 'email' => 'director@example.com']);
    }

    private function employeeWithAccount(): Employee
    {
        $role = Role::firstOrCreate(['name' => 'employee']);
        $user = User::factory()->create(['role_id' => $role->id, 'email' => 'staff@example.com']);
        $position = Position::create(['name' => 'Угтах үйлчилгээний ажилтан', 'portal' => 'reception']);

        return Employee::create([
            'user_id' => $user->id,
            'last_name' => 'Баясгалан',
            'first_name' => 'Билгүүн',
            'register_number' => 'УК98091228',
            'address' => 'УБ хот, БЗД, 14-р хороо',
            'email' => 'staff@example.com',
            'phone' => '95897789',
            'position_id' => $position->id,
            'salary' => 1200000,
            'status' => 'active',
        ]);
    }

    private function template(array $overrides = []): DocumentTemplate
    {
        return DocumentTemplate::create(array_merge([
            'type' => 'employment',
            'title' => 'Хөдөлмөрийн гэрээ',
            'body' => '<p>{{position}} {{employee_name}}, цалин {{salary}} /{{salary_text}}/</p>',
            'requires_employer_signature' => true,
            'requires_employee_signature' => true,
            'is_active' => true,
        ], $overrides));
    }

    public function test_document_is_created_from_template_with_employee_data_merged_in(): void
    {
        $employee = $this->employeeWithAccount();
        $template = $this->template();

        $this->actingAs($this->hrUser())
            ->post('/hr/employee-documents', [
                'employee_id' => $employee->id,
                'template_id' => $template->id,
                'doc_number' => '2026/07',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $document = EmployeeDocument::firstOrFail();

        $this->assertSame('draft', $document->status);
        $this->assertStringContainsString('Б.Билгүүн', $document->body);
        $this->assertStringContainsString('1,200,000', $document->body);
        $this->assertStringContainsString('нэг сая хоёр зуун мянган төгрөг', $document->body);
        // Орлуулга хийгдсэн тул түүхий {{талбар}} үлдэхгүй
        $this->assertStringNotContainsString('{{', $document->body);
    }

    public function test_employer_signature_sends_the_document_to_the_employee(): void
    {
        Notification::fake();

        $employee = $this->employeeWithAccount();
        $document = $this->makeDraft($employee, $this->template());

        $this->actingAs($this->hrUser())
            ->post("/hr/employee-documents/{$document->id}/sign", [
                'signature' => self::SIGNATURE,
                'employer_name' => 'Ж. Оюунбилэг',
                'employer_position' => 'Гүйцэтгэх захирал',
            ])
            ->assertRedirect();

        $document->refresh();

        $this->assertSame('pending_employee', $document->status);
        $this->assertNotNull($document->employer_signature);
        $this->assertNotNull($document->sent_at);

        Notification::assertSentTo($employee->user, EmployeeDocumentSent::class);
    }

    public function test_employee_signature_completes_the_document_and_mails_both_parties(): void
    {
        Mail::fake();
        Notification::fake();

        $employee = $this->employeeWithAccount();
        $director = $this->hrUser();
        $document = $this->makeDraft($employee, $this->template());

        $this->actingAs($director)->post("/hr/employee-documents/{$document->id}/sign", [
            'signature' => self::SIGNATURE,
            'employer_name' => 'Ж. Оюунбилэг',
            'employer_position' => 'Гүйцэтгэх захирал',
        ]);

        $this->actingAs($employee->user)
            ->post("/my/contracts/{$document->id}/sign", [
                'signature' => self::SIGNATURE,
                'agreed' => true,
            ])
            ->assertRedirect();

        $document->refresh();

        $this->assertSame('completed', $document->status);
        $this->assertNotNull($document->employee_signature);
        $this->assertNotNull($document->completed_at);

        // Ажилтан болон захирал хоёуланд нь PDF хавсаргасан гэрээ очно
        Mail::assertSent(EmployeeDocumentCompletedMail::class, fn ($m) => $m->hasTo('staff@example.com'));
        Mail::assertSent(EmployeeDocumentCompletedMail::class, fn ($m) => $m->hasTo('director@example.com'));

        Notification::assertSentTo($director, EmployeeDocumentSigned::class);
    }

    public function test_employee_cannot_sign_another_persons_document(): void
    {
        $owner = $this->employeeWithAccount();
        $document = $this->makeDraft($owner, $this->template(), 'pending_employee');

        $otherRole = Role::firstOrCreate(['name' => 'employee']);
        $intruder = User::factory()->create(['role_id' => $otherRole->id]);
        Employee::create([
            'user_id' => $intruder->id,
            'last_name' => 'Дорж',
            'first_name' => 'Сараа',
            'status' => 'active',
        ]);

        $this->actingAs($intruder)
            ->post("/my/contracts/{$document->id}/sign", [
                'signature' => self::SIGNATURE,
                'agreed' => true,
            ])
            ->assertForbidden();

        $this->assertNull($document->fresh()->employee_signature);
    }

    public function test_employee_can_decline_and_hr_is_notified(): void
    {
        Notification::fake();

        $employee = $this->employeeWithAccount();
        $director = $this->hrUser();
        $document = $this->makeDraft($employee, $this->template(), 'pending_employee');

        $this->actingAs($employee->user)
            ->post("/my/contracts/{$document->id}/decline", ['reason' => 'Цалингийн дүн тохиролцсоноос зөрүүтэй байна'])
            ->assertRedirect();

        $document->refresh();

        $this->assertSame('declined', $document->status);
        $this->assertStringContainsString('зөрүүтэй', $document->decline_reason);

        Notification::assertSentTo($director, EmployeeDocumentDeclined::class);
    }

    public function test_template_without_employee_signature_completes_on_employer_signature(): void
    {
        Mail::fake();
        Notification::fake();

        $employee = $this->employeeWithAccount();
        $template = $this->template(['requires_employee_signature' => false]);
        $document = $this->makeDraft($employee, $template);

        $this->actingAs($this->hrUser())->post("/hr/employee-documents/{$document->id}/sign", [
            'signature' => self::SIGNATURE,
            'employer_name' => 'Ж. Оюунбилэг',
            'employer_position' => 'Гүйцэтгэх захирал',
        ]);

        $this->assertSame('completed', $document->fresh()->status);
    }

    public function test_completed_document_cannot_be_edited_or_deleted(): void
    {
        $employee = $this->employeeWithAccount();
        $document = $this->makeDraft($employee, $this->template(), 'completed');
        $hr = $this->hrUser();

        $this->actingAs($hr)
            ->put("/hr/employee-documents/{$document->id}", [
                'title' => 'Өөрчилсөн нэр',
                'body' => '<p>Хуурамч агуулга</p>',
            ])
            ->assertSessionHas('error');

        $this->actingAs($hr)
            ->delete("/hr/employee-documents/{$document->id}")
            ->assertSessionHas('error');

        $this->assertSame('Хөдөлмөрийн гэрээ', $document->fresh()->title);
        $this->assertNotNull(EmployeeDocument::find($document->id));
    }

    public function test_template_body_is_sanitised_on_save(): void
    {
        $this->actingAs($this->hrUser())
            ->post('/hr/document-templates', [
                'type' => 'nda',
                'title' => 'Нууц хадгалах гэрээ',
                'body' => '<p>Нууцлал</p><script>alert(1)</script>',
            ])
            ->assertRedirect();

        $body = DocumentTemplate::where('title', 'Нууц хадгалах гэрээ')->value('body');

        $this->assertStringContainsString('<p>Нууцлал</p>', $body);
        $this->assertStringNotContainsString('<script', $body);
    }

    public function test_delivery_is_recorded_so_hr_can_see_the_contract_reached_the_employee(): void
    {
        Notification::fake();

        $employee = $this->employeeWithAccount();
        $document = $this->makeDraft($employee, $this->template(), 'pending_employee');

        $this->actingAs($employee->user)->post("/my/contracts/{$document->id}/sign", [
            'signature' => self::SIGNATURE,
            'agreed' => true,
        ]);

        $document->refresh();

        $this->assertNotNull($document->delivered_at);
        $this->assertContains('staff@example.com', $document->delivered_to);
        $this->assertNull($document->delivery_error);
    }

    public function test_employee_still_gets_the_contract_when_only_the_user_account_has_an_email(): void
    {
        Mail::fake();
        Notification::fake();

        $employee = $this->employeeWithAccount();
        // Ажилтны бүртгэлд и-мэйл байхгүй ч хэрэглэгчийн хаягаар очих ёстой
        $employee->forceFill(['email' => null])->save();

        $document = $this->makeDraft($employee, $this->template(), 'pending_employee');

        $this->actingAs($employee->user)->post("/my/contracts/{$document->id}/sign", [
            'signature' => self::SIGNATURE,
            'agreed' => true,
        ]);

        Mail::assertSent(EmployeeDocumentCompletedMail::class, fn ($m) => $m->hasTo('staff@example.com'));
    }

    public function test_hr_can_resend_a_completed_contract(): void
    {
        Mail::fake();
        Notification::fake();

        $employee = $this->employeeWithAccount();
        $document = $this->makeDraft($employee, $this->template(), 'completed');
        $document->forceFill(['completed_at' => now(), 'delivery_error' => 'SMTP timeout'])->save();

        $this->actingAs($this->hrUser())
            ->post("/hr/employee-documents/{$document->id}/redeliver")
            ->assertRedirect()
            ->assertSessionHas('success');

        Mail::assertSent(EmployeeDocumentCompletedMail::class, fn ($m) => $m->hasTo('staff@example.com'));
        $this->assertNull($document->fresh()->delivery_error);
    }

    public function test_only_completed_contracts_can_be_resent(): void
    {
        $employee = $this->employeeWithAccount();
        $document = $this->makeDraft($employee, $this->template(), 'draft');

        $this->actingAs($this->hrUser())
            ->post("/hr/employee-documents/{$document->id}/redeliver")
            ->assertSessionHas('error');
    }

    private function makeDraft(Employee $employee, DocumentTemplate $template, string $status = 'draft'): EmployeeDocument
    {
        return EmployeeDocument::create([
            'employee_id' => $employee->id,
            'template_id' => $template->id,
            'type' => $template->type,
            'title' => $template->title,
            'body' => '<p>Гэрээний агуулга</p>',
            'status' => $status,
            'employer_name' => 'Ж. Оюунбилэг',
            'employer_position' => 'Гүйцэтгэх захирал',
            'employee_name' => 'Б.Билгүүн',
            'employee_position' => $employee->position?->name,
        ]);
    }
}
