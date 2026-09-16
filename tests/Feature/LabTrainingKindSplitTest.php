<?php

namespace Tests\Feature;

use App\Models\HR\Employee;
use App\Models\HR\Position;
use App\Models\Lab\LabCourse;
use App\Models\Lab\LabLesson;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Видео ба файл сургалт хоёр тусдаа хуудсанд салсан эсэх.
 *
 * Гол баталгаа нь хоёр хуудас бие биенийхээ агуулгыг ХЭЗЭЭ Ч харуулахгүй
 * байх, мөн хичээлийн төрөл нь формоос биш СУРГАЛТААСАА тодорхойлогдох —
 * эс тэгвээс файл сургалт дотор видео хичээл үүсч, дүрслэл нь тааралдахгүй
 * болно.
 */
class LabTrainingKindSplitTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $role = Role::firstOrCreate(['name' => 'admin']);

        return User::factory()->create(['role_id' => $role->id, 'email' => 'director@example.com']);
    }

    private function employee(): User
    {
        $role     = Role::firstOrCreate(['name' => 'employee']);
        $user     = User::factory()->create(['role_id' => $role->id, 'email' => 'tech@example.com']);
        $position = Position::firstOrCreate(['name' => 'Лаборант'], ['portal' => 'lab']);

        Employee::create([
            'user_id'         => $user->id,
            'last_name'       => 'Дорж',
            'first_name'      => 'Болд',
            'register_number' => 'УК12345678',
            'email'           => 'tech@example.com',
            'phone'           => '99110000',
            'position_id'     => $position->id,
            'status'          => 'active',
        ]);

        return $user;
    }

    /** @return array{0: LabCourse, 1: LabLesson} */
    private function course(string $kind, string $title): array
    {
        $course = LabCourse::create([
            'kind'         => $kind,
            'title'        => $title,
            'is_published' => true,
        ]);

        $lesson = LabLesson::create([
            'lab_course_id' => $course->id,
            'kind'          => $kind,
            'title'         => $title.' — 1',
            'is_published'  => true,
            'page_count'    => $kind === 'document' ? 4 : 0,
            'doc_status'    => $kind === 'document' ? 'ready' : null,
            'doc_path'      => $kind === 'document' ? 'docs/x.pdf' : null,
        ]);

        return [$course, $lesson];
    }

    /** @return string[] */
    private function titlesOn(User $user, string $path): array
    {
        return collect($this->actingAs($user)->get($path)->viewData('page')['props']['courses'])
            ->pluck('title')
            ->all();
    }

    public function test_admin_pages_do_not_leak_the_other_kind(): void
    {
        $admin = $this->admin();

        $this->course(LabCourse::KIND_VIDEO, 'Бичлэгийн сургалт');
        $this->course(LabCourse::KIND_DOCUMENT, 'Журмын сургалт');

        $this->assertSame(['Бичлэгийн сургалт'], $this->titlesOn($admin, '/admin/lab-training'));
        $this->assertSame(['Журмын сургалт'], $this->titlesOn($admin, '/admin/lab-training/documents'));
    }

    public function test_employee_catalogues_do_not_leak_the_other_kind(): void
    {
        $user = $this->employee();

        $this->course(LabCourse::KIND_VIDEO, 'Бичлэгийн сургалт');
        $this->course(LabCourse::KIND_DOCUMENT, 'Журмын сургалт');

        $this->assertSame(['Бичлэгийн сургалт'], $this->titlesOn($user, '/my/training'));
        $this->assertSame(['Журмын сургалт'], $this->titlesOn($user, '/my/training/documents'));
    }

    public function test_each_page_renders_its_own_component(): void
    {
        $admin = $this->admin();
        $user  = $this->employee();

        $pages = [
            ['/admin/lab-training',           'admin/lab-training/index',     $admin],
            ['/admin/lab-training/documents', 'admin/lab-training/documents', $admin],
            ['/my/training',                  'my/training/index',            $user],
            ['/my/training/documents',        'my/training/documents',        $user],
        ];

        foreach ($pages as [$path, $component, $actor]) {
            $page = $this->actingAs($actor)->get($path)->assertOk()->viewData('page');

            $this->assertSame($component, $page['component'], $path.' буруу хуудас үзүүлж байна');
        }
    }

    public function test_new_course_keeps_the_kind_it_was_created_with(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/admin/lab-training/courses', [
            'title' => 'Шинэ файл сургалт',
            'kind'  => 'document',
        ])->assertRedirect();

        $course = LabCourse::firstWhere('title', 'Шинэ файл сургалт');
        $this->assertSame('document', $course->kind);

        // Засварт төрөл орохгүй — сургалт байрандаа үлдэнэ
        $this->actingAs($admin)->post('/admin/lab-training/courses/'.$course->id, [
            'title' => 'Нэр нь солигдсон',
            'kind'  => 'video',
        ])->assertRedirect();

        $this->assertSame('document', $course->fresh()->kind);
    }

    public function test_lesson_kind_comes_from_its_course_not_the_form(): void
    {
        $admin = $this->admin();
        [$docCourse] = $this->course(LabCourse::KIND_DOCUMENT, 'Журмын сургалт');

        // Формоос "video" гэж ирсэн ч сургалт нь файл тул баримт болно
        $this->actingAs($admin)->post('/admin/lab-training/lessons', [
            'lab_course_id'  => $docCourse->id,
            'title'          => 'Гараар оруулсан төрөл',
            'kind'           => 'video',
            'video_provider' => 'youtube',
            'video_ref'      => 'dQw4w9WgXcQ',
        ])->assertRedirect();

        $lesson = LabLesson::firstWhere('title', 'Гараар оруулсан төрөл');

        $this->assertSame('document', $lesson->kind);
        $this->assertNull($lesson->video_ref, 'Файл сургалтад видеоны эх сурвалж хадгалагдах ёсгүй');
    }
}
