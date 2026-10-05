<?php

namespace App\Services\Schedule;

use App\Models\HR\Shift;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Хуваарийн дүрмийн шалгалт — гаргагчид улаан/шар тэмдэг болж харагдана.
 * Хадгалахыг хаахгүй: эцсийн шийдвэр хүнд үлдэнэ.
 */
final class ScheduleRules
{
    /**
     * @param  Collection<int, Shift>  $shifts  хүчинтэй ээлжүүд (шалгах хугацаанаас 7 хоногийн өмнөхийг багтаасан)
     * @param  array<int, array<string, array{type: string, label: string, status: string}>>  $leaves
     * @param  array<int, array<string, string|null>>  $unavailable  [employee][date] => тэмдэглэл
     * @return list<array{employee_id: int, date: string, level: string, code: string, message: string}>
     */
    public static function check(Collection $shifts, array $leaves, array $unavailable, string $from, string $to): array
    {
        $weeklyLimit = ScheduleSettings::weeklyHoursLimit() * 60;
        $minRest = ScheduleSettings::minRestHours() * 60;
        $maxRun = ScheduleSettings::maxConsecutiveDays();

        $out = [];
        $add = function (int $emp, string $date, string $level, string $code, string $message) use (&$out, $from, $to) {
            if ($date >= $from && $date <= $to) {
                $out[] = ['employee_id' => $emp, 'date' => $date, 'level' => $level, 'code' => $code, 'message' => $message];
            }
        };

        // Эмч тухайн өдөр ажиллах эсэх — сувилагчийн хослолыг шалгахад
        $doctorDays = $shifts->filter(fn (Shift $s) => $s->isWork())
            ->mapWithKeys(fn (Shift $s) => [$s->employee_id.'|'.$s->date->toDateString() => true]);

        foreach ($shifts->groupBy('employee_id') as $employeeId => $list) {
            $employeeId = (int) $employeeId;
            $byDate = $list->groupBy(fn (Shift $s) => $s->date->toDateString())->sortKeys();

            foreach ($byDate as $date => $day) {
                $work = $day->filter(fn (Shift $s) => $s->isWork())->values();

                if ($work->isNotEmpty() && $day->contains(fn (Shift $s) => ! $s->isWork())) {
                    $add($employeeId, $date, 'error', 'mixed', 'Нэг өдөр ажил ба амралт зэрэг тавигдсан');
                }

                foreach ($work as $s) {
                    if (! $s->branch_id) {
                        $add($employeeId, $date, 'error', 'branch', 'Ээлжийн салбар сонгоогүй');
                    }
                    if ($s->assigned_doctor_id && ! $doctorDays->has($s->assigned_doctor_id.'|'.$date)) {
                        $add($employeeId, $date, 'warn', 'doctor', 'Хамт ажиллах эмч энэ өдөр хуваарьгүй');
                    }
                }

                // Давхцал
                $timed = $work->filter(fn (Shift $s) => $s->start_time && $s->end_time)->values();
                for ($i = 0; $i < $timed->count(); $i++) {
                    for ($j = $i + 1; $j < $timed->count(); $j++) {
                        [$a1, $a2] = self::span($timed[$i]);
                        [$b1, $b2] = self::span($timed[$j]);
                        if (ShiftMath::overlaps($a1, $a2, $b1, $b2)) {
                            $add($employeeId, $date, 'error', 'overlap', 'Ээлжүүд цагаараа давхцаж байна');
                        }
                    }
                }

                if ($work->isNotEmpty()) {
                    $leave = $leaves[$employeeId][$date] ?? null;
                    if ($leave) {
                        $leave['status'] === 'approved'
                            ? $add($employeeId, $date, 'error', 'leave', "Батлагдсан чөлөөтэй өдөр ээлж тавьсан ({$leave['label']})")
                            : $add($employeeId, $date, 'warn', 'leave_pending', "Чөлөөний хүсэлт хүлээгдэж байна ({$leave['label']})");
                    }
                    if (array_key_exists($date, $unavailable[$employeeId] ?? [])) {
                        $note = $unavailable[$employeeId][$date];
                        $add($employeeId, $date, 'warn', 'unavailable', 'Ажилтан энэ өдрийг боломжгүй гэж тэмдэглэсэн'.($note ? ": {$note}" : ''));
                    }
                }
            }

            // Ээлж хоорондын амралт (өмнөх өдрийн сүүлчийн дуусахаас дараагийн эхний эхлэх хүртэл)
            if ($minRest > 0) {
                $prevEnd = null;
                $prevDate = null;
                foreach ($byDate as $date => $day) {
                    $timed = $day->filter(fn (Shift $s) => $s->isWork() && $s->start_time && $s->end_time);
                    if ($timed->isEmpty()) {
                        continue;
                    }
                    $start = $timed->map(fn ($s) => self::span($s)[0])->min();
                    $end = $timed->map(fn ($s) => self::span($s)[1])->max();
                    if ($prevDate && Carbon::parse($prevDate)->addDay()->toDateString() === $date) {
                        $rest = ($start + 1440) - $prevEnd;
                        if ($rest < $minRest) {
                            $add($employeeId, $date, 'warn', 'rest', 'Ээлж хоорондын амралт '.ShiftMath::human(max(0, $rest)).' (доод тал нь '.intdiv($minRest, 60).'ц)');
                        }
                    }
                    $prevEnd = $end;
                    $prevDate = $date;
                }
            }

            // Дараалан ажилласан өдөр
            $run = 0;
            $last = null;
            foreach ($byDate as $date => $day) {
                if (! $day->contains(fn (Shift $s) => $s->isWork())) {
                    $run = 0;
                    $last = $date;

                    continue;
                }
                $run = ($last && Carbon::parse($last)->addDay()->toDateString() === $date) ? $run + 1 : 1;
                $last = $date;
                if ($run > $maxRun) {
                    $add($employeeId, $date, 'warn', 'consecutive', "{$run} дахь өдрөө дараалан ажиллаж байна (дээд тал нь {$maxRun})");
                }
            }

            // 7 хоногийн цагийн хязгаар — тухайн долоо хоногийн сүүлийн ажлын өдөр дээр тэмдэглэнэ
            foreach ($list->filter(fn (Shift $s) => $s->isWork())->groupBy(fn (Shift $s) => $s->date->copy()->startOfWeek()->toDateString()) as $week) {
                $total = $week->sum(fn (Shift $s) => $s->minutes());
                if ($total > $weeklyLimit) {
                    $lastDay = $week->max(fn (Shift $s) => $s->date->toDateString());
                    $add($employeeId, $lastDay, 'warn', 'weekly', '7 хоногт '.ShiftMath::human($total).' (хязгаар '.intdiv($weeklyLimit, 60).'ц)');
                }
            }
        }

        return $out;
    }

    /** @return array{0: int, 1: int} */
    private static function span(Shift $s): array
    {
        $a = ShiftMath::toMinutes($s->start_time) ?? 0;
        $b = ShiftMath::toMinutes($s->end_time) ?? 0;

        return [$a, $b > $a ? $b : $b + 1440];
    }
}
