<?php

namespace App\Services\CallPro;

use App\Models\Branch;
use App\Models\CallPro\Call;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Дуудлагын тайлангийн тооцоо.
 *
 * Тайлангийн хуудас, Excel экспорт, автомат өдрийн тайлан гурвуулаа энэ нэг
 * эх сурвалжийг ашиглана — тоо хоорондоо зөрөх боломжгүй.
 *
 * Спам дуудлага бүх үзүүлэлтээс ХАСАГДАНА: зар сурталчилгааны дуудлагыг
 * "алдсан" гэж тоолвол хариулалтын хувь худал доогуур гарна.
 */
class CallReportService
{
    /** @param  'day'|'week'|'month'  $groupBy */
    public function periods(string $from, string $to, ?int $branchId, string $groupBy = 'day'): array
    {
        $sql = $this->periodSql($groupBy);

        $rows = $this->base($from, $to, $branchId)
            ->select(
                DB::raw($sql.' as period'),
                ...$this->metricSelects(),
            )
            ->groupBy(DB::raw($sql))
            ->orderBy('period')
            ->get();

        return $rows->map(fn ($r) => $this->shape((string) $r->period, $r, $groupBy))->all();
    }

    public function totals(string $from, string $to, ?int $branchId): array
    {
        $row = $this->base($from, $to, $branchId)
            ->select(...$this->metricSelects())
            ->first();

        return $this->shape('Нийт', $row, 'day');
    }

    public function byBranch(string $from, string $to): array
    {
        $rows = $this->base($from, $to, null)
            ->select('branch_id', ...$this->metricSelects())
            ->groupBy('branch_id')
            ->get();

        $names = Branch::pluck('name', 'id');

        return $rows
            ->map(function ($r) use ($names) {
                $shaped = $this->shape(
                    $r->branch_id ? ($names[$r->branch_id] ?? '—') : 'Салбар тодорхойгүй',
                    $r,
                    'day',
                );
                $shaped['branch_id'] = $r->branch_id;

                return $shaped;
            })
            ->sortByDesc('total')
            ->values()
            ->all();
    }

    private function base(string $from, string $to, ?int $branchId): Builder
    {
        return Call::query()
            ->whereNotNull('started_at')
            ->whereDate('started_at', '>=', $from)
            ->whereDate('started_at', '<=', $to)
            ->when($branchId, fn ($q, $v) => $q->where('branch_id', $v));
    }

    /** Бүх тайланд ижил хэмжигдэхүүн — нэг газраас. */
    private function metricSelects(): array
    {
        return [
            DB::raw('COUNT(*) as total'),
            DB::raw('SUM(CASE WHEN is_spam = 1 THEN 1 ELSE 0 END) as spam'),
            DB::raw('SUM(CASE WHEN is_after_hours = 1 THEN 1 ELSE 0 END) as after_hours'),
            DB::raw('SUM(CASE WHEN is_spam = 0 AND is_missed = 1 THEN 1 ELSE 0 END) as missed'),
            DB::raw('SUM(CASE WHEN is_spam = 0 AND is_missed = 0 THEN 1 ELSE 0 END) as answered'),
            DB::raw('SUM(CASE WHEN is_spam = 0 AND is_missed = 1 AND handled_at IS NULL THEN 1 ELSE 0 END) as unhandled'),
            DB::raw("SUM(CASE WHEN resolution = 'appointment_made' THEN 1 ELSE 0 END) as appointments"),
            DB::raw('AVG(CASE WHEN is_missed = 0 THEN COALESCE(talk_time, duration) END) as avg_talk'),
        ];
    }

    private function shape(string $label, mixed $r, string $groupBy): array
    {
        $answered = (int) ($r->answered ?? 0);
        $missed = (int) ($r->missed ?? 0);
        $graded = $answered + $missed;

        return [
            'period' => $label,
            'label' => $this->prettyLabel($label, $groupBy),
            'total' => (int) ($r->total ?? 0),
            'answered' => $answered,
            'missed' => $missed,
            'unhandled' => (int) ($r->unhandled ?? 0),
            'after_hours' => (int) ($r->after_hours ?? 0),
            'spam' => (int) ($r->spam ?? 0),
            'appointments' => (int) ($r->appointments ?? 0),
            // Хариулалтын хувь спамгүй суурь дээр бодогдоно.
            'answer_rate' => $graded > 0 ? round($answered / $graded * 100, 1) : null,
            'avg_talk' => isset($r->avg_talk) && $r->avg_talk !== null
                ? (int) round((float) $r->avg_talk)
                : null,
        ];
    }

    private function prettyLabel(string $period, string $groupBy): string
    {
        if ($groupBy === 'day' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $period)) {
            return Carbon::parse($period)->format('m/d (D)');
        }

        return $period;
    }

    /**
     * Бүлэглэх SQL. MySQL болон SQLite өөр огнооны функцтэй тул драйвераар
     * салгана.
     */
    private function periodSql(string $groupBy): string
    {
        $sqlite = DB::connection()->getDriverName() === 'sqlite';

        return match ($groupBy) {
            'week' => $sqlite
                ? "strftime('%Y-W%W', started_at)"
                : "DATE_FORMAT(started_at, '%x-W%v')",
            'month' => $sqlite
                ? "strftime('%Y-%m', started_at)"
                : "DATE_FORMAT(started_at, '%Y-%m')",
            default => $sqlite
                ? "strftime('%Y-%m-%d', started_at)"
                : 'DATE(started_at)',
        };
    }
}
