<?php

namespace App\Services\Lab;

use App\Models\Lab\LabCourse;
use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabLesson;
use App\Models\Lab\LabLessonView;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Ажилтны сургалтын хувийн хэрэг.
 *
 * Гүйцэтгэлийн ярилцлага, шалгалт, шинэ албан тушаалд дэвшүүлэх үед "энэ хүн
 * юу үзсэн, юуг нь дуусгасан, шалгалтад хэрхэн тэнцсэн" гэдгийг НЭГ дор
 * харуулах ёстой. Тайлангийн хуудас болон PDF хоёул ЭНЭ нэг эх сурвалжаас
 * тэжээгдэнэ — ингэснээр дэлгэц дээрх тоо, хэвлэсэн тоо хоёр хэзээ ч
 * зөрөхгүй.
 *
 * ХАМРАХ ХҮРЭЭНИЙ ЗАРЧИМ: ажилтны "нийт хичээл" нь бүх хичээл БИШ, зөвхөн
 * албан тушаалдаа нээлттэй сургалтуудынх нь хичээл. Эс тэгвээс харах эрхгүй
 * хичээл нь гүйцэтгэлийг нь худал дутуу харуулна.
 */
class TrainingTranscript
{
    /**
     * @return array{
     *     employee: array<string, mixed>,
     *     totals: array<string, mixed>,
     *     courses: list<array<string, mixed>>,
     *     exams: list<array<string, mixed>>,
     *     overdue: list<array<string, mixed>>,
     *     timeline: list<array<string, mixed>>,
     * }
     */
    public static function for(User $user): array
    {
        $user->loadMissing(['employee.position', 'employee.branch']);

        $positionId = $user->employee?->position_id;

        $courses = LabCourse::query()
            ->where('is_published', true)
            ->forPosition($positionId)
            ->with([
                'category:id,name',
                'lessons' => fn ($q) => $q->where('is_published', true),
            ])
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        $lessonIds = $courses->flatMap(fn (LabCourse $c) => $c->lessons->pluck('id'));

        $views = LabLessonView::where('user_id', $user->id)
            ->whereIn('lab_lesson_id', $lessonIds)
            ->get()
            ->keyBy('lab_lesson_id');

        $attempts = LabExamAttempt::where('user_id', $user->id)
            ->whereIn('status', [LabExamAttempt::STATUS_SUBMITTED, LabExamAttempt::STATUS_GRADED])
            ->with('exam:id,title,pass_percent,lab_course_id')
            ->get();

        $courseRows = $courses
            ->map(fn (LabCourse $c) => self::course($c, $views))
            // Хичээлгүй сургалт бол хувийн хэрэгт мөр эзлэх шаардлагагүй
            ->filter(fn (array $row) => $row['total'] > 0)
            ->values()
            ->all();

        $examRows = self::exams($attempts);

        return [
            'employee' => self::employee($user),
            'totals'   => self::totals($courseRows, $examRows, $views),
            'courses'  => $courseRows,
            'exams'    => $examRows,
            'overdue'  => self::overdue($courses, $views),
            'timeline' => self::timeline($courses, $views, $attempts),
        ];
    }

    /** @return array<string, mixed> */
    protected static function employee(User $user): array
    {
        $e = $user->employee;

        return [
            'user_id'  => $user->id,
            'name'     => trim(($e?->last_name ?? '').' '.($e?->first_name ?? '')) ?: $user->name,
            'number'   => $e?->employee_number,
            'position' => $e?->position?->name,
            'branch'   => $e?->branch?->name,
            'email'    => $user->email,
            'hired_at' => $e?->hired_date?->format('Y-m-d'),
        ];
    }

    /**
     * Нэг сургалтын явц.
     *
     * @param  Collection<int, LabLessonView>  $views
     * @return array<string, mixed>
     */
    protected static function course(LabCourse $course, Collection $views): array
    {
        $lessons = $course->lessons->map(function (LabLesson $l) use ($views) {
            $v = $views->get($l->id);

            return [
                'id'              => $l->id,
                'title'           => $l->title,
                'duration_label'  => $l->duration_label,
                'is_required'     => (bool) $l->is_required,
                'due_at'          => $l->due_at?->format('Y-m-d'),
                'progress'        => (int) ($v?->progress_percent ?? 0),
                'views_count'     => (int) ($v?->views_count ?? 0),
                'watched_seconds' => (int) ($v?->watched_seconds ?? 0),
                'completed_at'    => $v?->completed_at?->format('Y-m-d'),
                'completed'       => $v?->completed_at !== null,
                // Заавал үзэх ёстой атлаа хугацаа нь өнгөрч, дуусгаагүй
                'is_late'         => $l->isOverdue() && $v?->completed_at === null,
            ];
        })->values();

        $total     = $lessons->count();
        $completed = $lessons->where('completed', true)->count();

        return [
            'id'          => $course->id,
            'title'       => $course->title,
            'category'    => $course->category?->name,
            'total'       => $total,
            'completed'   => $completed,
            'started'     => $lessons->where('views_count', '>', 0)->count(),
            'percent'     => $total > 0 ? (int) round($completed / $total * 100) : 0,
            'watch_hours' => round($lessons->sum('watched_seconds') / 3600, 1),
            'late'        => $lessons->where('is_late', true)->count(),
            'lessons'     => $lessons->all(),
        ];
    }

    /**
     * Шалгалтын дүн — шалгалт тус бүрийн ХАМГИЙН САЙН оролдлого.
     *
     * Дахин өгөх эрхтэй шалгалтад бүх оролдлогыг жагсаавал дүр зураг бүдгэрнэ.
     * Хамгийн сайн нь эцсийн үр дүн, оролдлогын тоо нь хичнээн хүчин чармайлт
     * шаардсаныг хэлнэ — хоёулаа хэрэгтэй тул хоёуланг нь нэг мөрөнд өгнө.
     *
     * @param  Collection<int, LabExamAttempt>  $attempts
     * @return list<array<string, mixed>>
     */
    protected static function exams(Collection $attempts): array
    {
        return $attempts
            ->groupBy('lab_exam_id')
            ->map(function (Collection $group) {
                $best = $group->sortByDesc('percent')->first();
                $last = $group->sortByDesc('submitted_at')->first();

                return [
                    'id'           => $best->lab_exam_id,
                    'title'        => $best->exam?->title ?? '—',
                    'pass_percent' => (int) ($best->exam?->pass_percent ?? 0),
                    'attempts'     => $group->count(),
                    'best_percent' => (int) $best->percent,
                    'best_score'   => (float) $best->score,
                    'max_score'    => (float) $best->max_score,
                    'is_passed'    => (bool) $group->contains('is_passed', true),
                    'pending'      => $group->contains('status', LabExamAttempt::STATUS_SUBMITTED),
                    'last_at'      => $last?->submitted_at?->format('Y-m-d'),
                ];
            })
            ->sortByDesc('last_at')
            ->values()
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $courses
     * @param  list<array<string, mixed>>  $exams
     * @param  Collection<int, LabLessonView>  $views
     * @return array<string, mixed>
     */
    protected static function totals(array $courses, array $exams, Collection $views): array
    {
        $total     = array_sum(array_column($courses, 'total'));
        $completed = array_sum(array_column($courses, 'completed'));
        $passed    = count(array_filter($exams, fn ($e) => $e['is_passed']));

        $scores = array_column($exams, 'best_percent');

        return [
            'courses'        => count($courses),
            'courses_done'   => count(array_filter($courses, fn ($c) => $c['percent'] >= 100)),
            'lessons'        => $total,
            'lessons_done'   => $completed,
            'percent'        => $total > 0 ? (int) round($completed / $total * 100) : 0,
            'watch_hours'    => round((int) $views->sum('watched_seconds') / 3600, 1),
            'exams_taken'    => count($exams),
            'exams_passed'   => $passed,
            'avg_exam_score' => $scores !== [] ? (int) round(array_sum($scores) / count($scores)) : null,
            'late'           => array_sum(array_column($courses, 'late')),
            'last_active_at' => $views->max('last_viewed_at')?->format('Y-m-d H:i'),
        ];
    }

    /**
     * Хугацаа хэтэрсэн заавал үзэх хичээлүүд — хамгийн эрт хоцорсноос нь.
     *
     * @param  Collection<int, LabCourse>  $courses
     * @param  Collection<int, LabLessonView>  $views
     * @return list<array<string, mixed>>
     */
    protected static function overdue(Collection $courses, Collection $views): array
    {
        return $courses
            ->flatMap(fn (LabCourse $c) => $c->lessons->map(fn (LabLesson $l) => [$c, $l]))
            ->filter(fn (array $pair) => $pair[1]->isOverdue()
                && $views->get($pair[1]->id)?->completed_at === null)
            ->map(fn (array $pair) => [
                'id'           => $pair[1]->id,
                'title'        => $pair[1]->title,
                'course_title' => $pair[0]->title,
                'due_at'       => $pair[1]->due_at?->format('Y-m-d'),
                // Carbon 3 нь бутархай, тэмдэгтэй утга буцаадаг тул абсолют болгоно
                'days_late'    => (int) abs((float) $pair[1]->due_at?->diffInDays(now())),
                'progress'     => (int) ($views->get($pair[1]->id)?->progress_percent ?? 0),
            ])
            ->sortByDesc('days_late')
            ->values()
            ->all();
    }

    /**
     * Ололтын түүх — дуусгасан хичээл ба өгсөн шалгалт нэг цагийн шугам дээр.
     *
     * Хувийн хэргийн гол хэсэг: "хэзээ юу хийсэн" гэдгийг он дараалалаар нь
     * харуулна. Хамгийн сүүлийн 40 бичлэгээр хязгаарлана — үүнээс урт бол
     * хэвлэсэн PDF хэт зузаан болно.
     *
     * @param  Collection<int, LabCourse>  $courses
     * @param  Collection<int, LabLessonView>  $views
     * @param  Collection<int, LabExamAttempt>  $attempts
     * @return list<array<string, mixed>>
     */
    protected static function timeline(Collection $courses, Collection $views, Collection $attempts): array
    {
        // ЭНД flatMap ХЭРЭГЛЭЖ БОЛОХГҮЙ: доор нь array_merge ажилладаг тул
        // хичээлийн ID (бүхэл тоон түлхүүр) 0,1,2 болж дахин дугаарлагдана.
        // Тэгвэл доорх хайлт хэзээ ч таарахгүй бөгөөд түүх хоосон гарна.
        $titles = [];

        foreach ($courses as $c) {
            foreach ($c->lessons as $l) {
                $titles[$l->id] = ['lesson' => $l->title, 'course' => $c->title];
            }
        }

        $lessonEvents = $views
            ->filter(fn (LabLessonView $v) => $v->completed_at !== null && isset($titles[$v->lab_lesson_id]))
            ->map(fn (LabLessonView $v) => [
                'kind'     => 'lesson',
                'at'       => $v->completed_at->format('Y-m-d H:i'),
                'sort'     => $v->completed_at->getTimestamp(),
                'title'    => $titles[$v->lab_lesson_id]['lesson'],
                'subtitle' => $titles[$v->lab_lesson_id]['course'],
                'detail'   => $v->progress_percent.'%',
                'ok'       => true,
            ])
            // keyBy-гаас ирсэн түлхүүрийг хаяна — доор concat хийхэд саад болно
            ->values();

        $examEvents = $attempts
            ->filter(fn (LabExamAttempt $a) => $a->submitted_at !== null)
            ->map(fn (LabExamAttempt $a) => [
                'kind'     => 'exam',
                'at'       => $a->submitted_at->format('Y-m-d H:i'),
                'sort'     => $a->submitted_at->getTimestamp(),
                'title'    => $a->exam?->title ?? 'Шалгалт',
                'subtitle' => $a->attempt_no > 1 ? "{$a->attempt_no}-р оролдлого" : 'Шалгалт',
                'detail'   => $a->percent.'%',
                'ok'       => (bool) $a->is_passed,
            ]);

        return $lessonEvents
            ->concat($examEvents)
            ->sortByDesc('sort')
            ->take(40)
            ->values()
            ->map(fn (array $e) => collect($e)->except('sort')->all())
            ->all();
    }
}
