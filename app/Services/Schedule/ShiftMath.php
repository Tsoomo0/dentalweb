<?php

namespace App\Services\Schedule;

/**
 * Ээлжийн цагийн энгийн тооцоо. Цагийг "HH:MM" эсвэл "HH:MM:SS" хэлбэрээр авна.
 * Дуусах цаг эхлэхээс өмнө/тэнцүү бол шөнө дамжсан гэж үзнэ.
 */
final class ShiftMath
{
    public static function hm(?string $time): ?string
    {
        return $time ? substr($time, 0, 5) : null;
    }

    public static function toMinutes(?string $time): ?int
    {
        if (! $time || ! preg_match('/^(\d{1,2}):(\d{2})/', $time, $m)) {
            return null;
        }

        return (int) $m[1] * 60 + (int) $m[2];
    }

    /** Цайны цагийг хассан ажлын минут. Цаг дутуу бол 0. */
    public static function minutes(?string $start, ?string $end, int $break = 0): int
    {
        $s = self::toMinutes($start);
        $e = self::toMinutes($end);
        if ($s === null || $e === null) {
            return 0;
        }

        $span = $e > $s ? $e - $s : $e + 1440 - $s;

        return max(0, $span - max(0, $break));
    }

    /** Хоёр [эхлэх, дуусах) интервал давхцаж байгаа эсэх (минутаар). */
    public static function overlaps(int $aStart, int $aEnd, int $bStart, int $bEnd): bool
    {
        return $aStart < $bEnd && $bStart < $aEnd;
    }

    /** Минутыг "7ц 30м" хэлбэрт. */
    public static function human(int $minutes): string
    {
        $h = intdiv($minutes, 60);
        $m = $minutes % 60;

        return $h ? ($m ? "{$h}ц {$m}м" : "{$h}ц") : "{$m}м";
    }
}
