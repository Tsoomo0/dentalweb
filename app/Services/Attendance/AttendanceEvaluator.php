<?php

namespace App\Services\Attendance;

use App\Models\HR\AttendanceLog;
use App\Services\Schedule\ScheduleSettings;
use Carbon\Carbon;

/**
 * Нэг ажилтны нэг өдрийн ирцийг НИЙТЛЭГДСЭН хуваарьтай харьцуулна.
 *
 *   late      — хуваарийн эхлэлээс хүлцлээс (grace) илүү хоцорсон бол бүтэн минут
 *   early     — хуваарийн дуусахаас хүлцлээс илүү эрт тарсан минут
 *   overtime  — хуваарийн дуусахаас хойш доод хэмжээнээс (otMin) илүү үлдсэн минут;
 *               хуваарьгүй/амралтын өдөр ажилласан бол ажилласан бүх хугацаа
 *
 * Төлөв: on_time | late | absent | missing (өнөөдөр ирээгүй байна) | upcoming |
 *        leave | unscheduled | present (цаггүй ээлж) | null (хуваарь ч ирц ч алга)
 */
final class AttendanceEvaluator
{
    public function __construct(
        private readonly int $grace,
        private readonly int $overtimeMin,
    ) {}

    public static function make(): self
    {
        return new self(ScheduleSettings::lateGrace(), ScheduleSettings::overtimeMin());
    }

    /**
     * @param  array{work: bool, off: bool, start_min: ?int, end_min: ?int, minutes: int}|null  $plan
     * @param  array{type: string, label: string, status: string}|null  $leave  батлагдсан чөлөө
     * @return array{status: ?string, late: int, early: int, overtime: int, scheduled: int, worked: int, no_checkout: bool}
     */
    public function evaluate(string $date, ?AttendanceLog $log, ?array $plan, ?array $leave, ?Carbon $now = null): array
    {
        $now ??= now();
        $today = $now->toDateString();
        $worked = $log?->worked_minutes ?? 0;
        $hasIn = $log?->checked_in_at !== null;
        $work = $plan && $plan['work'];

        $result = [
            'status' => null, 'late' => 0, 'early' => 0, 'overtime' => 0,
            'scheduled' => $work ? (int) $plan['minutes'] : 0, 'worked' => $worked,
            'no_checkout' => $hasIn && ! $log->checked_out_at && $date < $today,
        ];

        if (! $hasIn) {
            if ($leave) {
                $result['status'] = 'leave';
            } elseif ($work) {
                $startPassed = $plan['start_min'] !== null && $date === $today
                    && ($now->hour * 60 + $now->minute) > $plan['start_min'] + $this->grace;
                $result['status'] = $date < $today ? 'absent' : ($startPassed ? 'missing' : 'upcoming');
            }

            return $result;
        }

        if (! $work) {
            $result['status'] = 'unscheduled';
            $result['overtime'] = $worked;

            return $result;
        }

        if ($plan['start_min'] === null || $plan['end_min'] === null) {
            $result['status'] = 'present';

            return $result;
        }

        $in = self::minuteOfDay($log->checked_in_at);
        $lateBy = $in - $plan['start_min'];
        $result['late'] = $lateBy > $this->grace ? $lateBy : 0;
        $result['status'] = $result['late'] > 0 ? 'late' : 'on_time';

        if ($log->checked_out_at) {
            $out = self::minuteOfDay($log->checked_out_at);
            if ($log->checked_out_at->toDateString() > $date) {
                $out += 1440;
            }
            $earlyBy = $plan['end_min'] - $out;
            $result['early'] = $earlyBy > $this->grace ? $earlyBy : 0;
            $overBy = $out - $plan['end_min'];
            $result['overtime'] = $overBy >= max(1, $this->overtimeMin) ? $overBy : 0;
        }

        return $result;
    }

    private static function minuteOfDay(Carbon $t): int
    {
        return $t->hour * 60 + $t->minute;
    }
}
