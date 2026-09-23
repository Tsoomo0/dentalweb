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
        'call_work_hours',
        'call_sla_minutes',
        'call_notify_after_hours',
        'call_report_time',
    ];

    /** Тохиргоо алдагдсан үеийн аюулгүй хуваарь — Даваа–Бямба 09:00–20:00. */
    private const DEFAULT_HOURS = [
        1 => ['start' => '09:00', 'end' => '20:00'],
        2 => ['start' => '09:00', 'end' => '20:00'],
        3 => ['start' => '09:00', 'end' => '20:00'],
        4 => ['start' => '09:00', 'end' => '20:00'],
        5 => ['start' => '09:00', 'end' => '20:00'],
        6 => ['start' => '09:00', 'end' => '20:00'],
    ];

    /**
     * Гараг бүрийн ажлын цаг: `[1 => ['start' => '09:00', 'end' => '20:00'], ...]`
     *
     * ISO 8601 гараг: 1 = Даваа … 7 = Ням. Жагсаалтад БАЙХГҮЙ гараг нь
     * амралтын өдөр — салбар бүр өөр хуваарьтай байж болохыг тооцсон.
     *
     * Согогтой утга эсвэл бүрэн хоосон хуваарь ирвэл анхдагчид буцна: нэг ч
     * ажлын өдөргүй гэдэг нь бүх дуудлага «цагаас гадуур» болж, мэдэгдэл ба
     * SLA сэрэмжлүүлэг бүрэн унтрахыг хэлнэ — тохиргооны алдаанаас болж
     * систем чимээгүй болох ёсгүй.
     */
    public static function workHours(): array
    {
        $decoded = json_decode((string) Setting::get('call_work_hours', ''), true);

        if (! is_array($decoded)) {
            return self::DEFAULT_HOURS;
        }

        $hours = [];

        foreach ($decoded as $day => $row) {
            $day = (int) $day;

            if ($day < 1 || $day > 7 || ! is_array($row)) {
                continue;
            }

            $start = self::validTime($row['start'] ?? null);
            $end = self::validTime($row['end'] ?? null);

            // Ижил эхлэх/дуусах цаг нь 0 цаг уу, 24 цаг уу гэдэг нь ойлгомжгүй
            // тул хүлээж авахгүй. 24 цаг ажиллахыг 00:00–23:59 гэж бичнэ.
            if ($start === null || $end === null || $start === $end) {
                continue;
            }

            $hours[$day] = ['start' => $start, 'end' => $end];
        }

        ksort($hours);

        return $hours ?: self::DEFAULT_HOURS;
    }

    /** Ажиллах гарагууд. ISO 8601: 1 = Даваа … 7 = Ням. */
    public static function workDays(): array
    {
        return array_keys(self::workHours());
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
     * Гараг бүр өөрийн цагтай тул тухайн өдрийн хуваарийг хардаг. Ажил эхлэх
     * цаг нь дуусах цагаас хойш бол (жишээ: 20:00–02:00) шөнө дамжсан ээлж
     * гэж үзнэ — ийм үед ӨМНӨХ өдрийн ээлж өглөө рүү үргэлжилж байгаа эсэхийг
     * бас шалгана. Эс бөгөөс Мягмар гаригийн 01:00 цагийн дуудлага Даваагийн
     * ээлжийнх байсаар атлаа «цагаас гадуур» гэж тэмдэглэгдэнэ.
     */
    public static function isWorkingTime(?Carbon $at = null): bool
    {
        $at = $at ?? Carbon::now();
        $hours = self::workHours();
        $now = $at->format('H:i');

        $today = $hours[$at->isoWeekday()] ?? null;

        if ($today !== null) {
            $overnight = $today['start'] > $today['end'];

            if ($overnight ? $now >= $today['start'] : ($now >= $today['start'] && $now < $today['end'])) {
                return true;
            }
        }

        $yesterday = $hours[$at->copy()->subDay()->isoWeekday()] ?? null;

        return $yesterday !== null
            && $yesterday['start'] > $yesterday['end']
            && $now < $yesterday['end'];
    }

    /** Админ талд харуулах бүх утга. */
    public static function all(): array
    {
        return [
            'work_hours' => self::workHours(),
            'sla_minutes' => self::slaMinutes(),
            'notify_after_hours' => self::notifyAfterHours(),
            'report_time' => self::reportTime(),
        ];
    }

    /** "9:5" мэт согогтой утга ирвэл анхны утгыг ашиглана. */
    private static function time(string $key, string $default): string
    {
        return self::validTime(Setting::get($key, $default)) ?? $default;
    }

    /** `HH:MM` хэлбэртэй бол буцаана, эс бөгөөс null. */
    private static function validTime(mixed $value): ?string
    {
        $value = trim((string) $value);

        return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) ? $value : null;
    }
}
