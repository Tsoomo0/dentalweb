<?php

namespace App\Services\CallPro;

use App\Models\Setting;
use Illuminate\Support\Carbon;

/**
 * Дуудлагын үйл ажиллагааны тохиргоо — ажлын цаг, SLA, тайлангийн цаг.
 *
 * Тохиргоог `settings` хүснэгтэд `callpro` бүлгээр хадгална (админ талаас
 * засварлагдана). Утга байхгүй үед аюулгүй анхны утга буцаана — тохиргоо
 * устсанаас болж систем зогсох ёсгүй.
 */
class CallSettings
{
    public const KEYS = [
        'call_work_start',
        'call_work_end',
        'call_work_days',
        'call_sla_minutes',
        'call_notify_after_hours',
        'call_report_time',
    ];

    public static function workStart(): string
    {
        return self::time('call_work_start', '09:00');
    }

    public static function workEnd(): string
    {
        return self::time('call_work_end', '20:00');
    }

    /** ISO 8601 гарагууд: 1 = Даваа … 7 = Ням. */
    public static function workDays(): array
    {
        $raw = (string) Setting::get('call_work_days', '1,2,3,4,5,6');

        $days = collect(explode(',', $raw))
            ->map(fn ($d) => (int) trim($d))
            ->filter(fn (int $d) => $d >= 1 && $d <= 7)
            ->unique()
            ->sort()
            ->values()
            ->all();

        return $days ?: [1, 2, 3, 4, 5, 6];
    }

    /** Алдсан дуудлагыг хэдэн минутын дотор барих ёстой вэ. */
    public static function slaMinutes(): int
    {
        $value = (int) Setting::get('call_sla_minutes', 30);

        return $value > 0 ? $value : 30;
    }

    /** Ажлын цагаас гадуурх алдсан дуудлагад шөнө дунд мэдэгдэл өгөх эсэх. */
    public static function notifyAfterHours(): bool
    {
        return (string) Setting::get('call_notify_after_hours', '0') === '1';
    }

    public static function reportTime(): string
    {
        return self::time('call_report_time', '20:30');
    }

    /**
     * Өдрийн тайлан илгээх мөч болсон уу.
     *
     * Тохиргоог schedule тодорхойлох үед уншиж БОЛОХГҮЙ — тэр нь апп ачаалах
     * бүрт (миграц хийхээс ч өмнө) мэдээллийн санд хандана. Тиймээс команд нь
     * тогтмол давтамжтай ажиллаж, цаг нь болсон эсэхийг ЭНД шалгана.
     *
     * @param  int  $windowMinutes  Scheduler-ийн давтамжтай ижил байх ёстой.
     */
    public static function isReportDue(int $windowMinutes = 10, ?Carbon $at = null): bool
    {
        $at = $at ?? Carbon::now();

        [$hour, $minute] = array_map('intval', explode(':', self::reportTime()));
        $due = $at->copy()->setTime($hour, $minute);

        return $at->gte($due) && $at->lt($due->copy()->addMinutes($windowMinutes));
    }

    /**
     * Тухайн мөч ажлын цагт багтаж байна уу.
     *
     * Ажил эхлэх цаг нь дуусах цагаас хойш бол (жишээ: 20:00-09:00) шөнө
     * дамжсан ээлж гэж үзнэ.
     */
    public static function isWorkingTime(?Carbon $at = null): bool
    {
        $at = $at ?? Carbon::now();

        if (! in_array($at->isoWeekday(), self::workDays(), true)) {
            return false;
        }

        $now = $at->format('H:i');
        $start = self::workStart();
        $end = self::workEnd();

        return $start <= $end
            ? ($now >= $start && $now < $end)
            : ($now >= $start || $now < $end);
    }

    /** Админ талд харуулах бүх утга. */
    public static function all(): array
    {
        return [
            'work_start' => self::workStart(),
            'work_end' => self::workEnd(),
            'work_days' => self::workDays(),
            'sla_minutes' => self::slaMinutes(),
            'notify_after_hours' => self::notifyAfterHours(),
            'report_time' => self::reportTime(),
        ];
    }

    /** "9:5" мэт согогтой утга ирвэл анхны утгыг ашиглана. */
    private static function time(string $key, string $default): string
    {
        $value = trim((string) Setting::get($key, $default));

        return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) ? $value : $default;
    }
}
