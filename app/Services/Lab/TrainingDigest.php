<?php

namespace App\Services\Lab;

use App\Models\Lab\LabExamAttempt;
use App\Models\Lab\LabLesson;
use App\Models\Lab\LabLessonView;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Удирдлагад илгээх сургалтын хураангуй.
 *
 * Тайлангийн хуудас нь "орж ирээд харах" зарчмаар ажилладаг — админ санаж
 * ороогүй бол хэн ч хоцорсныг мэдэхгүй өнгөрнө. Энэ хураангуй нь эсрэгээр
 * ажиллана: долоо хоног бүр өөрөө очиж, юу анхаарах ёстойг хэлнэ.
 *
 * Гурван асуултад хариулна:
 *   1. Энэ долоо хоногт юу болов? (идэвх)
 *   2. Хэн хоцорч байна?          (нэрсээр — тоо биш)
 *   3. Аль хичээл ажиллахгүй байна? (хамрах хүрээ багатай)
 */
class TrainingDigest
{
    /** Нэрлэж жагсаах хамгийн их мөр — и-мэйл хэт урт болохоос сэргийлнэ. */
    public const LIST_LIMIT = 10;

    /**
     * @return array{
     *     audience: int,
     *     lessons: int,
     *     required: int,
     *     completion_percent: int,
     *     active_staff: int,
     *     completions: int,
     *     exams_taken: int,
     *     exams_passed: int,
     *     overdue_total: int,
     *     laggards: list<array{name: string, position: string|null, overdue: int, percent: int}>,
     *     cold_lessons: list<array{title: string, course: string|null, reach: int, audience: int, percent: int}>,
     *     idle_staff: list<array{name: string, position: string|null}>,
     * }
     */
    public static function build(CarbonInterface $from, CarbonInterface $to): array
    {
        $lessons = LabLesson::query()
            ->where('is_published', true)
            ->whereHas('course', fn ($q) => $q->where('is_published', true))
            ->with(['course:id,title', 'course.positions:id'])
            ->get();

        $staff = TrainingAudience::allEmployees()
            ->with('employee:id,user_id,first_name,last_name,position_id', 'employee.position:id,name')
            ->get();

        $views = LabLessonView::whereIn('lab_lesson_id', $lessons->pluck('id'))->get();

        // Хичээл бүрийн хамрах хүрээ — сургалтынхаа албан тушаалаас хамаарна
        $reachOf = self::audienceMap($lessons, $staff);

        $completedPairs = $views->whereNotNull('completed_at')
            ->map(fn (LabLessonView $v) => $v->user_id.':'.$v->lab_lesson_id)
            ->flip();

        $required = $lessons->filter(fn (LabLesson $l) => $l->isOverdue());

        $laggards = self::laggards($staff, $lessons, $required, $reachOf, $completedPairs, $views);

        return [
            'audience'           => $staff->count(),
            'lessons'            => $lessons->count(),
            'required'           => $lessons->where('is_required', true)->count(),
            'completion_percent' => self::completionPercent($staff, $lessons, $reachOf, $completedPairs),
            'active_staff'       => $views
                ->filter(fn (LabLessonView $v) => $v->last_viewed_at?->between($from, $to) ?? false)
                ->unique('user_id')
                ->count(),
            'completions'        => $views
                ->filter(fn (LabLessonView $v) => $v->completed_at?->between($from, $to) ?? false)
                ->count(),
            'exams_taken'        => LabExamAttempt::whereBetween('submitted_at', [$from, $to])->count(),
            'exams_passed'       => LabExamAttempt::whereBetween('submitted_at', [$from, $to])
                ->where('is_passed', true)
                ->count(),
            'overdue_total'      => array_sum(array_column($laggards, 'overdue')),
            'laggards'           => array_slice($laggards, 0, self::LIST_LIMIT),
            'cold_lessons'       => self::coldLessons($lessons, $views, $reachOf),
            'idle_staff'         => self::idleStaff($staff, $views),
        ];
    }

    /**
     * Хичээл бүрийг үзэх эрхтэй ажилтнуудын ID.
     *
     * @param  Collection<int, LabLesson>  $lessons
     * @param  Collection<int, User>  $staff
     * @return array<int, Collection<int, int>>  lesson_id => user_id-үүд
     */
    protected static function audienceMap(Collection $lessons, Collection $staff): array
    {
        $map = [];

        foreach ($lessons as $lesson) {
            $positions = $lesson->course?->positions->pluck('id') ?? collect();

            $map[$lesson->id] = $positions->isEmpty()
                ? $staff->pluck('id')
                : $staff
                    ->filter(fn (User $u) => $positions->contains($u->employee?->position_id))
                    ->pluck('id')
                    ->values();
        }

        return $map;
    }

    /**
     * Байгууллагын нийт дуусгалтын хувь.
     *
     * Хүртээмжийг харгалзана: "хийгдэх ёстой хичээл-ажилтны хос" хэдэн хувь нь
     * биелсэн бэ. Ингэснээр цөөн хүнд хамаарах сургалт бүх дүнг гажуудуулахгүй.
     *
     * @param  Collection<int, User>  $staff
     * @param  Collection<int, LabLesson>  $lessons
     * @param  array<int, Collection<int, int>>  $reachOf
     * @param  Collection<string, int>  $completedPairs
     */
    protected static function completionPercent(
        Collection $staff,
        Collection $lessons,
        array $reachOf,
        Collection $completedPairs,
    ): int {
        $expected = 0;
        $done     = 0;

        foreach ($lessons as $lesson) {
            foreach ($reachOf[$lesson->id] as $userId) {
                $expected++;

                if ($completedPairs->has($userId.':'.$lesson->id)) {
                    $done++;
                }
            }
        }

        return $expected > 0 ? (int) round($done / $expected * 100) : 0;
    }

    /**
     * Хугацаа хэтэрсэн хичээлтэй ажилтнууд — хамгийн их хоцорсноос нь.
     *
     * @param  Collection<int, User>  $staff
     * @param  Collection<int, LabLesson>  $lessons
     * @param  Collection<int, LabLesson>  $required  хугацаа нь хэтэрсэн заавал хичээлүүд
     * @param  array<int, Collection<int, int>>  $reachOf
     * @param  Collection<string, int>  $completedPairs
     * @param  Collection<int, LabLessonView>  $views
     * @return list<array{name: string, position: string|null, overdue: int, percent: int}>
     */
    protected static function laggards(
        Collection $staff,
        Collection $lessons,
        Collection $required,
        array $reachOf,
        Collection $completedPairs,
        Collection $views,
    ): array {
        return $staff
            ->map(function (User $u) use ($lessons, $required, $reachOf, $completedPairs) {
                $mine = $lessons->filter(fn (LabLesson $l) => $reachOf[$l->id]->contains($u->id));

                $done = $mine->filter(fn (LabLesson $l) => $completedPairs->has($u->id.':'.$l->id))->count();

                $overdue = $required
                    ->filter(fn (LabLesson $l) => $reachOf[$l->id]->contains($u->id)
                        && ! $completedPairs->has($u->id.':'.$l->id))
                    ->count();

                return [
                    'name'     => self::nameOf($u),
                    'position' => $u->employee?->position?->name,
                    'overdue'  => $overdue,
                    'percent'  => $mine->count() > 0 ? (int) round($done / $mine->count() * 100) : 0,
                ];
            })
            ->filter(fn (array $row) => $row['overdue'] > 0)
            ->sortByDesc('overdue')
            ->values()
            ->all();
    }

    /**
     * Хамрах хүрээндээ хамгийн бага хүрсэн хичээлүүд.
     *
     * "Муу хичээл" гэсэн үг биш — ихэвчлэн зарлаагүй, эсвэл олдоцгүй байрлалд
     * байгаа гэсэн дохио.
     *
     * @param  Collection<int, LabLesson>  $lessons
     * @param  Collection<int, LabLessonView>  $views
     * @param  array<int, Collection<int, int>>  $reachOf
     * @return list<array{title: string, course: string|null, reach: int, audience: int, percent: int}>
     */
    protected static function coldLessons(Collection $lessons, Collection $views, array $reachOf): array
    {
        $started = $views->where('views_count', '>', 0)->groupBy('lab_lesson_id');

        return $lessons
            ->map(function (LabLesson $l) use ($started, $reachOf) {
                $audience = $reachOf[$l->id]->count();
                $reach    = $started->get($l->id)?->count() ?? 0;

                return [
                    'title'    => $l->title,
                    'course'   => $l->course?->title,
                    'reach'    => $reach,
                    'audience' => $audience,
                    'percent'  => $audience > 0 ? (int) round($reach / $audience * 100) : 0,
                ];
            })
            // Хамрах хүрээгүй хичээл (тухайн албан тушаалд ажилтан алга) утгагүй
            ->filter(fn (array $row) => $row['audience'] > 0 && $row['percent'] < 50)
            ->sortBy('percent')
            ->take(5)
            ->values()
            ->all();
    }

    /**
     * Сургалтад огт орж үзээгүй ажилтнууд.
     *
     * @param  Collection<int, User>  $staff
     * @param  Collection<int, LabLessonView>  $views
     * @return list<array{name: string, position: string|null}>
     */
    protected static function idleStaff(Collection $staff, Collection $views): array
    {
        $active = $views->where('views_count', '>', 0)->pluck('user_id')->unique();

        return $staff
            ->reject(fn (User $u) => $active->contains($u->id))
            ->map(fn (User $u) => [
                'name'     => self::nameOf($u),
                'position' => $u->employee?->position?->name,
            ])
            ->take(self::LIST_LIMIT)
            ->values()
            ->all();
    }

    protected static function nameOf(User $u): string
    {
        return trim(($u->employee?->last_name ?? '').' '.($u->employee?->first_name ?? '')) ?: $u->name;
    }
}
