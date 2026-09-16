<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Шалгалт — сургалт эсвэл тодорхой хичээлд холбогдоно. */
class LabExam extends Model
{
    public const STATE_UPCOMING = 'upcoming';
    public const STATE_OPEN     = 'open';
    public const STATE_CLOSED   = 'closed';

    public const ANSWERS_NEVER        = 'never';
    public const ANSWERS_AFTER_SUBMIT = 'after_submit';
    public const ANSWERS_AFTER_PASS   = 'after_pass';

    protected $fillable = [
        'lab_course_id', 'lab_lesson_id', 'title', 'description',
        'duration_minutes', 'pass_percent',
        'shuffle_questions', 'shuffle_options', 'show_answers',
        'opens_at', 'closes_at', 'is_published', 'created_by',
    ];

    protected $casts = [
        'duration_minutes'  => 'integer',
        'pass_percent'      => 'integer',
        'shuffle_questions' => 'boolean',
        'shuffle_options'   => 'boolean',
        'opens_at'          => 'datetime',
        'closes_at'         => 'datetime',
        'is_published'      => 'boolean',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(LabCourse::class, 'lab_course_id');
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(LabLesson::class, 'lab_lesson_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(LabExamQuestion::class)->orderBy('order')->orderBy('id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(LabExamAttempt::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Нийт боломжит оноо.
     *
     * Relation-ыг property-ээр уншсанаар eager load хийсэн үед нэмэлт query
     * явуулахгүй (жагсаалт дээр шалгалт бүрт давтагдахаас сэргийлнэ).
     */
    public function getMaxScoreAttribute(): float
    {
        return (float) $this->questions->sum('points');
    }

    /**
     * Лаб ажилтанд харагдах шалгалтууд.
     *
     * Нийтлэгдсэн, мөн холбогдсон сургалт/хичээл нь нийтлэгдсэн байх ёстой.
     * Хугацаа нь болоогүй эсвэл дууссан шалгалтыг ЭНД шүүхгүй — ажилтан
     * "удахгүй нээгдэнэ" / "хаагдсан" гэдгийг харах ёстой, эс тэгвээс
     * шалгалт нь чимээгүй алга болж, юу болсныг мэдэхгүй үлдэнэ.
     */
    public function scopeAvailable($query)
    {
        return $query
            ->where('is_published', true)
            ->where(fn ($q) => $q->whereNull('lab_course_id')
                ->orWhereHas('course', fn ($c) => $c->where('is_published', true)))
            ->where(fn ($q) => $q->whereNull('lab_lesson_id')
                ->orWhereHas('lesson', fn ($l) => $l->where('is_published', true)));
    }

    /**
     * Албан тушаалаар хандах эрхийн шүүлт.
     *
     * Шалгалт өөрөө албан тушаал сонгодоггүй — холбогдсон сургалтынхаа
     * зөвшөөрлийг дагана. Сургалт, хичээл аль алинд нь холбогдоогүй бие даасан
     * шалгалт бүх ажилтанд нээлттэй.
     */
    public function scopeForPosition($query, ?int $positionId)
    {
        return $query->where(function ($q) use ($positionId) {
            $q->whereHas('course', fn ($c) => $c->forPosition($positionId))
                ->orWhere(fn ($w) => $w->whereNull('lab_course_id')
                    ->whereHas('lesson.course', fn ($c) => $c->forPosition($positionId)))
                ->orWhere(fn ($w) => $w->whereNull('lab_course_id')->whereNull('lab_lesson_id'));
        });
    }

    /** Тухайн хэрэглэгч энэ шалгалтыг өгөх эрхтэй эсэх. */
    public function isVisibleTo(?\App\Models\User $user): bool
    {
        $course = $this->course ?? $this->lesson?->course;

        return $course ? $course->isVisibleTo($user) : $user !== null;
    }

    /** Хугацааны төлөв — "удахгүй" / "нээлттэй" / "хаагдсан". */
    public function state(): string
    {
        if ($this->opens_at && $this->opens_at->isFuture()) {
            return self::STATE_UPCOMING;
        }
        if ($this->closes_at && $this->closes_at->isPast()) {
            return self::STATE_CLOSED;
        }

        return self::STATE_OPEN;
    }

    /** Яг одоо өгөх боломжтой эсэх (нээлттэй хугацаанд, нийтлэгдсэн). */
    public function isOpen(): bool
    {
        if (! $this->is_published) {
            return false;
        }
        if ($this->opens_at && $this->opens_at->isFuture()) {
            return false;
        }
        if ($this->closes_at && $this->closes_at->isPast()) {
            return false;
        }

        return true;
    }

    /** Ажилтан зөв хариултаа харах эрхтэй эсэх. */
    public function revealsAnswersFor(?LabExamAttempt $attempt): bool
    {
        if (! $attempt || $attempt->status === LabExamAttempt::STATUS_IN_PROGRESS) {
            return false;
        }

        return match ($this->show_answers) {
            self::ANSWERS_AFTER_SUBMIT => true,
            self::ANSWERS_AFTER_PASS   => (bool) $attempt->is_passed,
            default                    => false,
        };
    }
}
