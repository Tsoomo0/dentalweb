<?php

namespace App\Services\Lab;

use App\Models\Lab\LabCourse;
use App\Models\Lab\LabExam;
use App\Models\Lab\LabLesson;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Дотоод сургалтын "хамрах хүрээ" — нэг сургалтыг үзэх ёстой ажилтнууд.
 *
 * Өмнө нь хамрах хүрээ нь зөвхөн лаб порталын ажилтан байсан. Одоо сургалт
 * бүр өөрийн албан тушаалын жагсаалттай тул хамрах хүрээ сургалт тус бүрд
 * өөр. Албан тушаал сонгоогүй сургалт нь идэвхтэй БҮХ ажилтанд хамаарна.
 */
class TrainingAudience
{
    /** Идэвхтэй ажилтны картад холбогдсон бүх хэрэглэгч. */
    public static function allEmployees(): Builder
    {
        return User::whereHas('employee', fn ($q) => $q->where('status', 'active'));
    }

    /** Тодорхой албан тушаалуудад харьяалагдах идэвхтэй ажилтнууд. */
    public static function forPositions(Collection $positionIds): Builder
    {
        if ($positionIds->isEmpty()) {
            return static::allEmployees();
        }

        return User::whereHas('employee', fn ($q) => $q
            ->where('status', 'active')
            ->whereIn('position_id', $positionIds));
    }

    /** Нэг сургалтын хамрах хүрээ. */
    public static function forCourse(?LabCourse $course): Builder
    {
        if (! $course) {
            return static::allEmployees();
        }

        return static::forPositions($course->positions()->pluck('positions.id'));
    }

    /** Хичээлийн хамрах хүрээ — түүний сургалтаас удамшина. */
    public static function forLesson(LabLesson $lesson): Builder
    {
        return static::forCourse($lesson->course);
    }

    /**
     * Шалгалтын хамрах хүрээ.
     *
     * Сургалтад холбогдоогүй бие даасан шалгалт бүх ажилтанд нээлттэй.
     */
    public static function forExam(LabExam $exam): Builder
    {
        return static::forCourse($exam->course ?? $exam->lesson?->course);
    }

    public static function countForCourse(?LabCourse $course): int
    {
        return static::forCourse($course)->count();
    }

    public static function countForLesson(LabLesson $lesson): int
    {
        return static::countForCourse($lesson->course);
    }
}
