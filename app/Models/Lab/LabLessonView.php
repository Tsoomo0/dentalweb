<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Ажилтан бүрийн нэг хичээл дэх үзэлтийн явц. */
class LabLessonView extends Model
{
    /** Энэ хувиас дээш үзвэл "үзэж дууссан" гэж тооцно. */
    public const COMPLETE_AT = 90;

    /** Видеог хэдэн секундын нүд болгон хувааж бүртгэх вэ. */
    public const BUCKET_SECONDS = 5;

    protected $fillable = [
        'lab_lesson_id', 'user_id', 'views_count', 'watched_seconds',
        'watched_buckets', 'last_position', 'progress_percent', 'completed_at',
        'first_viewed_at', 'last_viewed_at',
    ];

    /**
     * Шинэ мөрийн анхны утга. Эдгээргүй бол firstOrNew-ээр үүссэн загварын
     * талбарууд null байж, JSON хариунд null percent явдаг.
     */
    protected $attributes = [
        'views_count'      => 0,
        'watched_seconds'  => 0,
        'last_position'    => 0,
        'progress_percent' => 0,
    ];

    protected $casts = [
        'views_count'      => 'integer',
        'watched_seconds'  => 'integer',
        'last_position'    => 'integer',
        'progress_percent' => 'integer',
        'completed_at'     => 'datetime',
        'first_viewed_at'  => 'datetime',
        'last_viewed_at'   => 'datetime',
    ];

    /** Тухайн урттай видео хэдэн нүд болох вэ. */
    public static function bucketCount(int $durationSeconds): int
    {
        return max(1, (int) ceil($durationSeconds / self::BUCKET_SECONDS));
    }

    /**
     * Шинээр үзсэн нүднүүдийг өмнөх зураглал дээр нэмнэ.
     *
     * Зураглал нь '0'/'1' тэмдэгтийн мөр — нэг нүд нэг тэмдэгт. Ингэснээр
     * унших/бичихэд хялбар, 2 цагийн видео ч ердөө 1.4KB эзэлнэ.
     *
     * @param  array<int>  $indexes
     */
    public static function mergeBuckets(?string $map, array $indexes, int $total): string
    {
        // Урт өөрчлөгдсөн бол зураглалыг шинэ хэмжээнд тааруулна
        $map = str_pad(substr((string) $map, 0, $total), $total, '0');

        foreach ($indexes as $i) {
            if ($i >= 0 && $i < $total) {
                $map[$i] = '1';
            }
        }

        return $map;
    }

    /** Зураглал дээр хэдэн нүд тэмдэглэгдсэн бэ. */
    public static function seenCount(?string $map): int
    {
        return substr_count((string) $map, '1');
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(LabLesson::class, 'lab_lesson_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
