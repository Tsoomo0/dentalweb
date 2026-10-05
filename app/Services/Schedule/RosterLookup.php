<?php

namespace App\Services\Schedule;

use App\Models\HR\Shift;

/**
 * НИЙТЛЭГДСЭН хуваарийг ажилтан × өдрөөр нэгтгэнэ — ирц, HR самбар, My портал,
 * AI мэдлэгийн сан бүгд эндээс уншина (ноорог хэзээ ч орохгүй).
 *
 * Нэг өдөр хэд хэдэн ээлжтэй бол: эхлэх = хамгийн эрт, дуусах = хамгийн орой,
 * минут = ээлжүүдийн нийлбэр (салбар хооронд шилжих зай тооцогдохгүй).
 */
final class RosterLookup
{
    /**
     * @param  iterable<int>  $employeeIds
     * @return array<int, array<string, array{
     *     work: bool, off: bool, start: ?string, end: ?string, start_min: ?int, end_min: ?int,
     *     minutes: int, label: string, branch_ids: list<int>, shifts: list<Shift>
     * }>>
     */
    public static function plans(iterable $employeeIds, string $from, string $to): array
    {
        $ids = collect($employeeIds)->map(fn ($id) => (int) $id)->unique()->values()->all();
        if ($ids === []) {
            return [];
        }

        $shifts = Shift::published()
            ->with(['template:id,name,code,color', 'branch:id,name', 'assignedDoctor:id,first_name,last_name'])
            ->whereIn('employee_id', $ids)
            ->whereBetween('date', [$from, $to])
            ->orderBy('start_time')
            ->get();

        $out = [];
        foreach ($shifts->groupBy(fn (Shift $s) => $s->employee_id.'|'.$s->date->toDateString()) as $key => $day) {
            [$employeeId, $date] = explode('|', $key);
            $out[(int) $employeeId][$date] = self::summarize($day->values()->all());
        }

        return $out;
    }

    /** Нэг ажилтны нэг өдрийн нийтлэгдсэн төлөвлөгөө. */
    public static function forDay(int $employeeId, string $date): ?array
    {
        return self::plans([$employeeId], $date, $date)[$employeeId][$date] ?? null;
    }

    /** @param list<Shift> $shifts */
    public static function summarize(array $shifts): array
    {
        $work = array_values(array_filter($shifts, fn (Shift $s) => $s->isWork()));

        $startMin = null;
        $endMin = null;
        $minutes = 0;
        foreach ($work as $s) {
            $st = ShiftMath::toMinutes($s->start_time);
            $en = ShiftMath::toMinutes($s->end_time);
            if ($st === null || $en === null) {
                continue;
            }
            if ($en <= $st) {
                $en += 1440;
            }
            $startMin = $startMin === null ? $st : min($startMin, $st);
            $endMin = $endMin === null ? $en : max($endMin, $en);
            $minutes += $s->minutes();
        }

        $fmt = fn (?int $m) => $m === null ? null : sprintf('%02d:%02d', intdiv($m % 1440, 60), $m % 60);

        return [
            'work' => $work !== [],
            'off' => $work === [] && $shifts !== [],
            'start' => $fmt($startMin),
            'end' => $fmt($endMin),
            'start_min' => $startMin,
            'end_min' => $endMin,
            'minutes' => $minutes,
            'label' => implode(' + ', array_map(fn (Shift $s) => $s->template?->name ?? ($s->isWork() ? 'Ажил' : 'Амралт'), $work ?: $shifts)),
            'branch_ids' => array_values(array_unique(array_filter(array_map(fn (Shift $s) => $s->branch_id, $work)))),
            'shifts' => $shifts,
        ];
    }
}
