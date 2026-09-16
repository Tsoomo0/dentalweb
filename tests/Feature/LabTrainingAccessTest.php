<?php

namespace Tests\Feature;

use App\Models\HR\Employee;
use App\Models\HR\Position;
use App\Models\Lab\LabCourse;
use App\Models\Lab\LabExam;
use App\Models\Lab\LabLesson;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Дотоод сургалт — албан тушаалаар хандах эрх.
 *
 * Сургалтад албан тушаал сонгосон бол зөвхөн тэр албан тушаалтай ажилтан
 * харна. Нэг ч сонгоогүй бол бүх ажилтанд нээлттэй. Шүүлт нь жагсаалт дээр
 * төдийгүй шууд линкээр орох бүх цэг дээр биелэх ёстой.
 */
class LabTrainingAccessTest extends TestCase
{
    use RefreshDatabase;

    private function employee(string $positionName, string $email): array
    {
        $role = Role::firstOrCreate(['name' => 'employee']);
        $user = User::factory()->create(['role_id' => $role->id, 'email' => $email]);
        $position = Position::firstOrCreate(['name' => $positionName], ['portal' => 'hr']);

        Employee::create([
            'user_id' => $user->id,
            'last_name' => 'Дорж',
            'first_name' => 'Болд',
            'register_number' => 'УК'.random_int(10000000, 99999999),
            'email' => $email,
            'phone' => '99110000',
            'position_id' => $position->id,
            'status' => 'active',
        ]);

        return [$user, $position];
    }

    private function courseWithLesson(string $title): array
    {
        $course = LabCourse::create([
            'title' => $title,
            'is_published' => true,
        ]);

        $lesson = LabLesson::create([
            'lab_course_id' => $course->id,
            'title' => $title.' — 1-р хичээл',
            'is_published' => true,
        ]);

        return [$course, $lesson];
    }

    public function test_course_without_positions_is_visible_to_every_employee(): void
    {
        [$user] = $this->employee('Сувилагч', 'nurse@example.com');
        [$course, $lesson] = $this->courseWithLesson('Нийтийн сургалт');

        $this->actingAs($user)->get('/my/training')->assertOk();
        $this->actingAs($user)->get('/my/training/courses/'.$course->id)->assertOk();
        $this->actingAs($user)->get('/my/training/lessons/'.$lesson->id)->assertOk();
    }

    public function test_course_is_hidden_from_other_positions(): void
    {
        [$labUser, $labPosition] = $this->employee('Лаборант', 'lab@example.com');
        [$nurse] = $this->employee('Сувилагч', 'nurse@example.com');

        [$course, $lesson] = $this->courseWithLesson('Зөвхөн лаборантад');
        $course->positions()->sync([$labPosition->id]);

        // Эрхтэй ажилтан — бүх цэг нээлттэй
        $this->actingAs($labUser)->get('/my/training/courses/'.$course->id)->assertOk();
        $this->actingAs($labUser)->get('/my/training/lessons/'.$lesson->id)->assertOk();

        // Эрхгүй ажилтан — шууд линкээр ч орохгүй
        $this->actingAs($nurse)->get('/my/training/courses/'.$course->id)->assertForbidden();
        $this->actingAs($nurse)->get('/my/training/lessons/'.$lesson->id)->assertForbidden();
        $this->actingAs($nurse)->get('/my/training/lessons/'.$lesson->id.'/stream')->assertForbidden();
        $this->actingAs($nurse)->post('/my/training/lessons/'.$lesson->id.'/progress', [
            'position' => 10, 'delta' => 10,
        ])->assertForbidden();
    }

    public function test_listing_only_shows_courses_for_the_employee_position(): void
    {
        [$labUser, $labPosition] = $this->employee('Лаборант', 'lab@example.com');
        [$nurse] = $this->employee('Сувилагч', 'nurse@example.com');

        [$restricted] = $this->courseWithLesson('Зөвхөн лаборантад');
        $restricted->positions()->sync([$labPosition->id]);

        $this->courseWithLesson('Нийтийн сургалт');

        $titles = fn (User $u) => collect(
            $this->actingAs($u)->get('/my/training')->viewData('page')['props']['courses']
        )->pluck('title')->all();

        $this->assertEqualsCanonicalizing(
            ['Зөвхөн лаборантад', 'Нийтийн сургалт'],
            $titles($labUser),
        );
        $this->assertSame(['Нийтийн сургалт'], $titles($nurse));
    }

    public function test_user_without_an_employee_card_cannot_reach_training(): void
    {
        $role = Role::firstOrCreate(['name' => 'patient']);
        $patient = User::factory()->create(['role_id' => $role->id, 'email' => 'patient@example.com']);

        [, $lesson] = $this->courseWithLesson('Нийтийн сургалт');

        $this->actingAs($patient)->get('/my/training')->assertForbidden();
        $this->actingAs($patient)->get('/my/training/lessons/'.$lesson->id)->assertForbidden();
    }

    public function test_admin_can_assign_positions_when_creating_a_course(): void
    {
        $role = Role::firstOrCreate(['name' => 'admin']);
        $admin = User::factory()->create(['role_id' => $role->id, 'email' => 'director@example.com']);
        $position = Position::create(['name' => 'Лаборант', 'portal' => 'lab']);

        $this->actingAs($admin)->get('/admin/lab-training')->assertOk();
        $this->actingAs($admin)->get('/admin/lab-training/documents')->assertOk();
        $this->actingAs($admin)->get('/admin/lab-training/exams')->assertOk();
        $this->actingAs($admin)->get('/admin/lab-training/report')->assertOk();

        $this->actingAs($admin)->post('/admin/lab-training/courses', [
            'title' => 'Зөвхөн лаборантад',
            // Сургалт видео эсвэл файл гэдгээ үүсэх мөчдөө тогтооно
            'kind' => 'video',
            'is_published' => true,
            'position_ids' => [$position->id],
        ])->assertRedirect();

        $course = LabCourse::firstWhere('title', 'Зөвхөн лаборантад');
        $this->assertSame([$position->id], $course->positions()->pluck('positions.id')->all());

        // Хичээлийн тайлан нь хамрах хүрээг сургалтын албан тушаалаас бодно
        $lesson = LabLesson::create([
            'lab_course_id' => $course->id,
            'title' => 'Нэгдүгээр хичээл',
            'is_published' => true,
        ]);
        $this->actingAs($admin)->get('/admin/lab-training/report/lessons/'.$lesson->id)->assertOk();

        // Хоосон илгээвэл хязгаарлалт арилж, бүх ажилтанд нээгдэнэ
        $this->actingAs($admin)->post('/admin/lab-training/courses/'.$course->id, [
            'title' => 'Зөвхөн лаборантад',
            'is_published' => true,
        ])->assertRedirect();

        $this->assertSame(0, $course->positions()->count());
    }

    public function test_exam_inherits_the_course_position_rule(): void
    {
        [$labUser, $labPosition] = $this->employee('Лаборант', 'lab@example.com');
        [$nurse] = $this->employee('Сувилагч', 'nurse@example.com');

        [$course] = $this->courseWithLesson('Зөвхөн лаборантад');
        $course->positions()->sync([$labPosition->id]);

        $exam = LabExam::create([
            'lab_course_id' => $course->id,
            'title' => 'Улирлын шалгалт',
            'pass_percent' => 60,
            'is_published' => true,
        ]);

        $this->actingAs($labUser)->get('/my/training/exams/'.$exam->id)->assertOk();
        $this->actingAs($nurse)->get('/my/training/exams/'.$exam->id)->assertForbidden();
        $this->actingAs($nurse)->post('/my/training/exams/'.$exam->id.'/start')->assertForbidden();

        $listed = fn (User $u) => collect(
            $this->actingAs($u)->get('/my/training/exams')->viewData('page')['props']['exams']
        )->pluck('title')->all();

        $this->assertSame(['Улирлын шалгалт'], $listed($labUser));
        $this->assertSame([], $listed($nurse));
    }
}
