<?php

namespace App\Models\Lab;

use App\Models\HR\Position;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Дотоод сургалт — нэг төрлийн хичээлүүдийн бүлэг.
 *
 * `kind` нь сургалт БҮХЭЛДЭЭ юуны тухай болохыг заана:
 *   video    → бичлэгийн сургалт, админ болон ажилтны "Видео сургалт" хуудсанд
 *   document → файлын сургалт, "Файл сургалт" хуудсанд
 *
 * Доторх хичээл бүр сургалтынхаа төрлийг ЗААВАЛ дагана — хичээл нэмэх үед
 * сервер төрлийг сургалтаас нь авдаг тул холимог сургалт үүсэхгүй.
 */
class LabCourse extends Model
{
    /** Сургалтын төрөл — аль хуудсанд харагдахыг тодорхойлно. */
    public const KIND_VIDEO    = 'video';
    public const KIND_DOCUMENT = 'document';

    protected $fillable = [
        'lab_category_id', 'kind', 'title', 'slug', 'description', 'cover_image',
        'order', 'is_published', 'created_by',
    ];

    protected $casts = [
        'order'        => 'integer',
        'is_published' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $course) {
            $course->slug ??= static::uniqueSlug($course->title);
        });

        // Хичээлүүдийг DB cascade-д даалгахгүй, модель дамжуулж устгана —
        // ингэснээр LabLesson-ы deleting hook ажиллаж reaction цэвэрлэгдэнэ.
        static::deleting(function (self $course) {
            $course->lessons()->each(fn (LabLesson $lesson) => $lesson->delete());
        });
    }

    /** Гарчгаас давхардахгүй slug үүсгэнэ. */
    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'surgalt';
        $slug = $base;
        $i = 2;

        while (static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }

    public function isDocument(): bool
    {
        return $this->kind === self::KIND_DOCUMENT;
    }

    /** Зөвхөн нэг төрлийн сургалт — хуудас бүр өөрийнхөө төрлөөр шүүнэ. */
    public function scopeOfKind(Builder $query, string $kind): Builder
    {
        return $query->where('kind', $kind);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(LabCategory::class, 'lab_category_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(LabSection::class)->orderBy('order')->orderBy('id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(LabLesson::class)->orderBy('order')->orderBy('id');
    }

    public function exams(): HasMany
    {
        return $this->hasMany(LabExam::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Сургалтыг үзэх эрхтэй албан тушаалууд.
     *
     * ХООСОН бол сургалт бүх ажилтанд нээлттэй. Нэг ч албан тушаал сонгосон
     * бол зөвхөн тэр албан тушаалтай ажилтан үзнэ.
     */
    public function positions(): BelongsToMany
    {
        return $this->belongsToMany(Position::class, 'lab_course_position');
    }

    /**
     * Тухайн албан тушаалд харагдах сургалтууд.
     *
     * Албан тушаалгүй хэрэглэгчид (ажилтны карт холбоогүй) зөвхөн бүх нийтэд
     * нээлттэй сургалтууд харагдана.
     */
    public function scopeForPosition(Builder $query, ?int $positionId): Builder
    {
        return $query->where(function (Builder $q) use ($positionId) {
            $q->whereDoesntHave('positions');

            if ($positionId) {
                $q->orWhereHas('positions', fn (Builder $p) => $p->whereKey($positionId));
            }
        });
    }

    /**
     * Тухайн албан тушаал энэ сургалтыг үзэх эрхтэй эсэх.
     *
     * Албан тушаал сонгоогүй сургалт бүгдэд нээлттэй тул албан тушаалгүй
     * хэрэглэгч ч гэсэн үзнэ.
     */
    public function isVisibleToPosition(?int $positionId): bool
    {
        $allowed = $this->positions()->pluck('positions.id');

        return $allowed->isEmpty() || ($positionId !== null && $allowed->contains($positionId));
    }

    /** Тухайн хэрэглэгч энэ сургалтыг үзэх эрхтэй эсэх (админ бүгдийг үзнэ). */
    public function isVisibleTo(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->isAdmin() || $this->isVisibleToPosition($user->employee?->position_id);
    }

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_image ? Storage::url($this->cover_image) : null;
    }
}
