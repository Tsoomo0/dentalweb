<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\Storage;

/**
 * Нэг хичээл — видео эсвэл баримт.
 *
 * `kind` нь аль хэлбэр болохыг заана:
 *   video    → тоглуулагч ажиллана, явц нь 5 секундын нүдээр хэмжигдэнэ
 *   document → PDF уншигч ажиллана, явц нь ХУУДСААР хэмжигдэнэ
 *
 * Файл өөрөө DB-д хэзээ ч ОРОХГҮЙ, зөвхөн зам нь бичигдэнэ.
 *
 * Видеонд video_provider нь файл хаана байгааг заана:
 *   local   → video_path, private диск, stream route-аар үзнэ
 *   r2 / s3 → video_path, түр хугацааны signed URL
 *   youtube → video_ref (video ID), iframe
 *
 * Баримтад doc_path нь үзүүлэх PDF, doc_source_path нь анхны файл (PPT/DOCX
 * байсан бол хөрвүүлэхээс өмнөх хувилбар).
 */
class LabLesson extends Model
{
    public const PROVIDER_LOCAL   = 'local';
    public const PROVIDER_YOUTUBE = 'youtube';
    public const PROVIDER_R2      = 'r2';

    /** Хичээлийн төрөл — тоглуулагч эсвэл баримт уншигчийн аль нь ажиллах вэ. */
    public const KIND_VIDEO    = 'video';
    public const KIND_DOCUMENT = 'document';

    protected $fillable = [
        'lab_course_id', 'lab_section_id', 'title', 'description', 'order', 'kind',
        'video_provider', 'video_path', 'video_ref', 'poster_path',
        'doc_path', 'doc_source_path', 'doc_source_name', 'doc_status', 'doc_error', 'page_count',
        'duration_seconds', 'file_size', 'checksum', 'attachments',
        'is_published', 'published_at', 'is_required', 'due_at', 'created_by',
    ];

    protected $casts = [
        'order'            => 'integer',
        'duration_seconds' => 'integer',
        'file_size'        => 'integer',
        'page_count'       => 'integer',
        'attachments'      => 'array',
        'is_published'     => 'boolean',
        'published_at'     => 'datetime',
        'is_required'      => 'boolean',
        'due_at'           => 'datetime',
    ];

    public function isDocument(): bool
    {
        return $this->kind === self::KIND_DOCUMENT;
    }

    /** Баримт нь үзэхэд бэлэн болсон эсэх (хөрвүүлэлт дуусаж, хуудас нь тоологдсон). */
    public function isDocumentReady(): bool
    {
        return $this->isDocument()
            && $this->doc_status === 'ready'
            && $this->doc_path !== null
            && $this->page_count > 0;
    }

    /**
     * Явцын зураглалын нүдний тоо.
     *
     * Видеонд нэг нүд = 5 секунд, баримтад нэг нүд = НЭГ ХУУДАС. Хоёулаа
     * `lab_lesson_views.watched_buckets` дээр ижилхэн '0'/'1' мөр болж
     * хадгалагдана — тиймээс тайлан, хувийн хэрэг, сануулга бүгд ямар ч
     * өөрчлөлтгүйгээр хоёр төрөл дээр ажиллана.
     */
    public function unitCount(): int
    {
        return $this->isDocument()
            ? max(0, (int) $this->page_count)
            : LabLessonView::bucketCount((int) $this->duration_seconds);
    }

    /**
     * Reaction нь morphTo учир гадаад түлхүүргүй — DB cascade түүнийг
     * устгаж чадахгүй. Мөн сэтгэгдлүүд нь FK cascade-аар шууд устдаг тул
     * тэдгээрийн reaction ч өнчин үлдэнэ. Хоёуланг нь энд цэвэрлэнэ.
     */
    protected static function booted(): void
    {
        static::deleting(function (self $lesson) {
            LabReaction::where('reactable_type', LabLessonComment::class)
                ->whereIn('reactable_id', $lesson->comments()->withTrashed()->pluck('id'))
                ->delete();

            $lesson->reactions()->delete();
        });
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(LabCourse::class, 'lab_course_id');
    }

    /**
     * Албан тушаалаар хандах эрхийн шүүлт.
     *
     * Хичээл өөрөө албан тушаал сонгодоггүй — сургалтынхаа зөвшөөрлийг дагана.
     */
    public function scopeForPosition($query, ?int $positionId)
    {
        return $query->whereHas('course', fn ($c) => $c->forPosition($positionId));
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(LabSection::class, 'lab_section_id');
    }

    public function views(): HasMany
    {
        return $this->hasMany(LabLessonView::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(LabLessonComment::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(LabLessonNote::class);
    }

    /** Заавал үзэх бөгөөд хугацаа нь өнгөрсөн эсэх. */
    public function isOverdue(): bool
    {
        return $this->is_required && $this->due_at !== null && $this->due_at->isPast();
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(LabReaction::class, 'reactable');
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
     * Картан дээр харагдах зураг.
     *
     * Байршуулсан видеонд poster нь upload хийх үед browser дээр гардаг.
     * YouTube хичээлд poster байхгүй тул YouTube-ийн өөрийнх нь зургийг
     * ашиглана — ингэснээр каталог дээр хоосон хар дөрвөлжин үлдэхгүй.
     */
    public function getPosterUrlAttribute(): ?string
    {
        if ($this->poster_path) {
            return Storage::url($this->poster_path);
        }

        if ($this->video_provider === self::PROVIDER_YOUTUBE && $this->video_ref) {
            return "https://img.youtube.com/vi/{$this->video_ref}/hqdefault.jpg";
        }

        return null;
    }

    /** Тоглуулагч руу дамжуулах эх сурвалж. */
    public function playbackSource(): array
    {
        return match ($this->video_provider) {
            self::PROVIDER_YOUTUBE => ['provider' => 'youtube', 'src' => $this->video_ref],
            default                => ['provider' => 'file', 'src' => route('my.training.stream', $this)],
        };
    }

    /** 12:34 хэлбэрийн урт, баримт бол "12 хуудас". */
    public function getDurationLabelAttribute(): string
    {
        if ($this->isDocument()) {
            return $this->page_count > 0 ? $this->page_count.' хуудас' : '—';
        }

        $s = (int) $this->duration_seconds;
        if ($s <= 0) {
            return '—';
        }

        $h   = intdiv($s, 3600);
        $m   = intdiv($s % 3600, 60);
        $sec = $s % 60;

        return $h > 0
            ? sprintf('%d:%02d:%02d', $h, $m, $sec)
            : sprintf('%d:%02d', $m, $sec);
    }
}
