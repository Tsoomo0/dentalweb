<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabLesson;
use App\Models\Lab\LabLessonComment;
use App\Models\Lab\LabLessonView;
use App\Models\Lab\LabReaction;
use App\Models\User;
use App\Services\Lab\RetentionAnalyzer;
use App\Services\Lab\TrainingAudience;
use App\Services\Lab\TrainingTranscript;
use App\Services\Lab\TrainingTranscriptPdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Админ тал — дотоод сургалтын үзэлт, гүйцэтгэл, сэтгэгдлийн нэгдсэн тайлан. */
class LabTrainingReportController extends Controller
{
    public function index(): Response
    {
        $audience    = LabCourseController::audienceCount();
        $audienceFor = LabCourseController::audienceCounter();

        $lessons = LabLesson::with(['course:id,title', 'course.positions:id'])
            ->withCount([
                'views as viewers_count'   => fn ($q) => $q->where('views_count', '>', 0),
                'views as completed_count' => fn ($q) => $q->whereNotNull('completed_at'),
                'comments',
                'reactions',
            ])
            ->withAvg('views as avg_progress', 'progress_percent')
            ->withSum('views as total_watched', 'watched_seconds')
            ->orderByDesc('id')
            ->get()
            ->map(function (LabLesson $l) use ($audienceFor) {
                // Хамрах хүрээ нь хичээл бүрд өөр — сургалтдаа сонгосон албан
                // тушаалаас хамаарна. Нийт ажилтнаар хувь бодвол хязгаарлагдмал
                // сургалтын гүйцэтгэл үргэлж бага харагдана.
                $reach = $audienceFor($l->course?->positions->pluck('id') ?? collect());

                return [
                'id'              => $l->id,
                'title'           => $l->title,
                'course_title'    => $l->course?->title,
                'is_published'    => $l->is_published,
                'duration_label'  => $l->duration_label,
                'poster_url'      => $l->poster_url,
                'video_provider'  => $l->video_provider,
                'viewers_count'   => $l->viewers_count,
                'completed_count' => $l->completed_count,
                'comments_count'  => $l->comments_count,
                'reactions_count' => $l->reactions_count,
                'avg_progress'    => (int) round((float) $l->avg_progress),
                'watch_hours'     => round(((int) $l->total_watched) / 3600, 1),
                'audience'        => $reach,
                'reach_percent'   => $reach > 0
                    ? (int) round($l->viewers_count / $reach * 100)
                    : 0,
                'is_required'     => $l->is_required,
                'due_at'          => $l->due_at?->format('Y-m-d'),
                // Заавал үзэх ёстой атлаа хугацаа нь дуусахад дуусгаагүй ажилтан
                'overdue_count'   => $l->isOverdue()
                    ? max(0, $reach - $l->completed_count)
                    : 0,
                ];
            });

        return Inertia::render('admin/lab-training/report', [
            'audience' => $audience,
            'totals'   => [
                'lessons'    => $lessons->count(),
                'published'  => $lessons->where('is_published', true)->count(),
                'viewers'    => LabLessonView::where('views_count', '>', 0)->distinct('user_id')->count('user_id'),
                'watch_hours' => round((int) LabLessonView::sum('watched_seconds') / 3600, 1),
                'comments'   => LabLessonComment::count(),
                'reactions'  => LabReaction::count(),
                'overdue'    => $lessons->sum('overdue_count'),
            ],
            'lessons'   => $lessons,
            'employees' => $this->employeeProgress(),
            'comments'  => $this->recentComments(),
        ]);
    }

    /**
     * Ажилтан тус бүрийн сургалтын гүйцэтгэл.
     *
     * Ажилтан бүрийн "нийт хичээл" нь өөр — албан тушаалдаа нээлттэй
     * сургалтуудынх нь хичээл л тоологдоно. Эс тэгвээс харах эрхгүй хичээл
     * гүйцэтгэлийг нь дутуу харуулна.
     */
    protected function employeeProgress(): array
    {
        $lessons = LabLesson::where('is_published', true)
            ->with('course.positions:id')
            ->get(['id', 'lab_course_id', 'is_required', 'due_at']);

        // Хичээл бүрийг үзэх эрхтэй албан тушаалууд (хоосон → бүгд).
        $allowed = $lessons->mapWithKeys(fn (LabLesson $l) => [
            $l->id => $l->course?->positions->pluck('id') ?? collect(),
        ]);

        return TrainingAudience::allEmployees()
            ->with('employee:id,user_id,first_name,last_name,position_id', 'employee.position:id,name')
            ->get()
            ->map(function (User $u) use ($lessons, $allowed) {
                $positionId = $u->employee?->position_id;

                $visible = $lessons->filter(fn (LabLesson $l) => $allowed[$l->id]->isEmpty()
                    || ($positionId && $allowed[$l->id]->contains($positionId)));

                $publishedLessons = $visible->count();

                // Заавал үзэх ёстой атлаа хугацаа нь дууссан хичээлүүд
                $overdueIds = $visible
                    ->filter(fn (LabLesson $l) => $l->is_required && $l->due_at && $l->due_at->isPast())
                    ->pluck('id');

                $views = LabLessonView::where('user_id', $u->id)
                    ->whereIn('lab_lesson_id', $visible->pluck('id'))
                    ->get();

                $attempts = LabExamAttempt::where('user_id', $u->id)
                    ->whereIn('status', [LabExamAttempt::STATUS_SUBMITTED, LabExamAttempt::STATUS_GRADED])
                    ->get();

                $completed = $views->whereNotNull('completed_at')->count();

                // Хугацаа хэтэрсэн заавал хичээлээс дуусгаагүй нь
                $doneIds = $views->whereNotNull('completed_at')->pluck('lab_lesson_id');
                $overdue = $overdueIds->diff($doneIds)->count();

                return [
                    'id'             => $u->id,
                    'name'           => trim(($u->employee?->last_name ?? '').' '.($u->employee?->first_name ?? '')) ?: $u->name,
                    'position'       => $u->employee?->position?->name,
                    'started'        => $views->where('views_count', '>', 0)->count(),
                    'completed'      => $completed,
                    'total_lessons'  => $publishedLessons,
                    'percent'        => $publishedLessons > 0
                        ? (int) round($completed / $publishedLessons * 100)
                        : 0,
                    'watch_hours'    => round((int) $views->sum('watched_seconds') / 3600, 1),
                    'last_viewed_at' => $views->max('last_viewed_at')?->format('Y-m-d H:i'),
                    'overdue'        => $overdue,
                    'exams_taken'    => $attempts->count(),
                    'exams_passed'   => $attempts->where('is_passed', true)->count(),
                    'avg_exam_score' => $attempts->isNotEmpty()
                        ? (int) round($attempts->avg('percent'))
                        : null,
                ];
            })
            ->sortByDesc('percent')
            ->values()
            ->all();
    }

    /** Сүүлийн үеийн сэтгэгдлүүд — модерацид зориулав. */
    protected function recentComments(): array
    {
        return LabLessonComment::with(['user:id,name', 'lesson:id,title'])
            ->withCount('reactions')
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (LabLessonComment $c) => [
                'id'              => $c->id,
                'body'            => $c->body,
                'user_name'       => $c->user?->name ?? '—',
                'lesson_id'       => $c->lab_lesson_id,
                'lesson_title'    => $c->lesson?->title,
                'is_reply'        => $c->parent_id !== null,
                'is_pinned'       => $c->is_pinned,
                'is_hidden'       => $c->is_hidden,
                'reactions_count' => $c->reactions_count,
                'created_at'      => $c->created_at?->format('Y-m-d H:i'),
            ])
            ->all();
    }

    /** Сэтгэгдлийг онцлох / онцлолыг авах. */
    public function pinComment(LabLessonComment $comment): RedirectResponse
    {
        $comment->update(['is_pinned' => ! $comment->is_pinned]);

        return back();
    }

    /** Сэтгэгдлийг нуух / буцааж харуулах (устгахгүй). */
    public function hideComment(LabLessonComment $comment): RedirectResponse
    {
        $comment->update(['is_hidden' => ! $comment->is_hidden]);

        return back();
    }

    public function destroyComment(LabLessonComment $comment): RedirectResponse
    {
        $comment->delete();

        return back()->with('success', 'Сэтгэгдэл устлаа.');
    }

    /** Нэг хичээлийн дэлгэрэнгүй үзэлт — хэн, хэдэн хувь үзсэн. */
    public function lesson(LabLesson $labLesson): Response
    {
        $audienceQuery = TrainingAudience::forLesson($labLesson);
        $audience = (clone $audienceQuery)->count();

        $views = LabLessonView::where('lab_lesson_id', $labLesson->id)
            ->with('user:id,name')
            ->get()
            ->keyBy('user_id');

        /** Нэг үзэлтийн мөрийг (эсвэл огт үзээгүйн хоосон утгыг) хүснэгтийн мөр болгоно. */
        $row = fn (int $id, string $name, ?LabLessonView $v) => [
            'user_id'         => $id,
            'user_name'       => $name,
            'views_count'     => (int) ($v?->views_count ?? 0),
            'watched_seconds' => (int) ($v?->watched_seconds ?? 0),
            'progress'        => (int) ($v?->progress_percent ?? 0),
            'completed'       => $v?->completed_at !== null,
            'last_viewed_at'  => $v?->last_viewed_at?->format('Y-m-d H:i'),
        ];

        // Хамрах хүрээний БҮХ ажилтныг гаргана — "огт үзээгүй" гэдэг нь зөвхөн
        // тоо биш, нэр болж харагдах ёстой. Эс тэгвээс хэнийг сануулахаа мэдэхгүй.
        $staff = $audienceQuery
            ->with('employee:id,user_id,first_name,last_name')
            ->get();

        $viewers = $staff
            ->map(fn (User $u) => $row(
                $u->id,
                trim(($u->employee?->last_name ?? '').' '.($u->employee?->first_name ?? '')) ?: $u->name,
                $views->get($u->id),
            ))
            // Хамрах хүрээнээс гарсан (албан тушаал нь өөрчлөгдсөн) атлаа өмнө нь
            // үзсэн ажилтны бүртгэл алдагдах ёсгүй — сүүлд нь нэмж тавина.
            ->concat(
                $views->reject(fn (LabLessonView $v) => $staff->contains('id', $v->user_id))
                    ->map(fn (LabLessonView $v) => $row((int) $v->user_id, $v->user?->name ?? '—', $v))
                    ->values()
            )
            ->sortByDesc('progress')
            ->values();

        return Inertia::render('admin/lab-training/lesson-report', [
            'lesson' => [
                'id'               => $labLesson->id,
                'title'            => $labLesson->title,
                'course_title'     => $labLesson->course?->title,
                'duration_label'   => $labLesson->duration_label,
                'duration_seconds' => $labLesson->duration_seconds,
                'video_provider'   => $labLesson->video_provider,
                'video_ref'        => $labLesson->video_ref,
                'has_video'        => (bool) ($labLesson->video_path ?: $labLesson->video_ref),
                'poster_url'       => $labLesson->poster_url,
                'is_published'     => $labLesson->is_published,
                'is_required'      => $labLesson->is_required,
                'due_at'           => $labLesson->due_at?->format('Y-m-d'),
                'is_overdue'       => $labLesson->isOverdue(),
            ],
            'audience' => $audience,
            'viewers'  => $viewers,
            'comments' => $labLesson->comments()
                ->with('user:id,name')
                ->withCount('reactions')
                ->latest('id')
                ->get()
                ->map(fn ($c) => [
                    'id'              => $c->id,
                    'body'            => $c->body,
                    'user_name'       => $c->user?->name ?? '—',
                    'is_reply'        => $c->parent_id !== null,
                    'is_pinned'       => $c->is_pinned,
                    'is_hidden'       => $c->is_hidden,
                    'reactions_count' => $c->reactions_count,
                    'created_at'      => $c->created_at?->format('Y-m-d H:i'),
                ]),
            'reactions' => $labLesson->reactions()
                ->selectRaw('type, count(*) as total')
                ->groupBy('type')
                ->pluck('total', 'type'),

            // Видеоны аль хэсэгт хэдэн хүн байсныг харуулах муруй. Шинэ өгөгдөл
            // цуглуулаагүй — үзэлтийн зураглалыг босоо тэнхлэгээр нэгтгэсэн.
            'retention' => RetentionAnalyzer::forLesson($labLesson, $views->values()),
        ]);
    }

    /**
     * Ажилтны сургалтын хувийн хэрэг.
     *
     * Тайлангийн хүснэгт нь "хэн хоцорч байна"-г хэлдэг ч "энэ хүн яг юу
     * үзсэн бэ" гэдэгт хариулдаггүй байлаа. Гүйцэтгэлийн ярилцлага бүрд
     * админ гар аргаар мөр мөрөөр нь эрж олох шаардлагатай болдог. Энэ хуудас
     * түүнийг нэг дор, хэвлэхэд бэлэн хэлбэрээр өгнө.
     */
    public function employee(User $user): Response
    {
        return Inertia::render('admin/lab-training/employee-report', [
            'transcript' => TrainingTranscript::for($user),
        ]);
    }

    /** Хувийн хэргийг PDF болгож татах. */
    public function employeePdf(User $user): StreamedResponse
    {
        $pdf  = TrainingTranscriptPdf::raw($user);
        $name = TrainingTranscriptPdf::fileName($user);

        return response()->streamDownload(fn () => print $pdf, $name, [
            'Content-Type' => 'application/pdf',
        ]);
    }
}
