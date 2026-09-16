<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Админ тал — дуудлагын хянах самбар.
 *
 * Хариулах ёстой асуултууд:
 *   1. Дуудлага алдаж байна уу, хандлага нь ямар байна?
 *   2. Алдсан дуудлагууд эргэж холбогдож байна уу? (хамгийн чухал)
 *   3. Хэдэн цагт алддаг вэ? → хүн хүчний хуваарь
 *   4. Аль салбар сул байна вэ?
 *   5. Алдсан дуудлага цаг захиалга болж хувирдаг уу?
 */
class CallDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'from' => $request->query('from') ?: Carbon::now()->subDays(29)->toDateString(),
            'to' => $request->query('to') ?: Carbon::now()->toDateString(),
            'branch_id' => $request->query('branch_id'),
        ];

        return Inertia::render('admin/calls/dashboard', [
            'filters' => $filters,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'summary' => $this->summary($filters),
            'hourly' => $this->hourly($filters),
            'daily' => $this->daily($filters),
            'byBranch' => $this->byBranch($filters),
            'byAgent' => $this->byAgent($filters),
            'resolutions' => $this->resolutions($filters),
            'repeatCallers' => $this->repeatCallers($filters),
            'resolutionLabels' => Call::RESOLUTIONS,
        ]);
    }

    private function base(array $f): Builder
    {
        return Call::query()
            ->whereNotNull('started_at')
            ->whereDate('started_at', '>=', $f['from'])
            ->whereDate('started_at', '<=', $f['to'])
            ->when($f['branch_id'], fn ($q, $v) => $q->where('branch_id', $v));
    }

    /* ── Драйверын ялгааг нуух туслахууд ────────────────────────────────────
       Production дээр MySQL, тест дээр SQLite ажилладаг тул огноо/цагийн
       функцийг шууд бичиж болохгүй. */

    private function isSqlite(): bool
    {
        return DB::connection()->getDriverName() === 'sqlite';
    }

    private function hourSql(): string
    {
        return $this->isSqlite()
            ? "CAST(strftime('%H', started_at) AS INTEGER)"
            : 'HOUR(started_at)';
    }

    /** Алдсанаас шийдвэрлэх хүртэлх хугацаа, минутаар. */
    private function handleMinutesExpr(): Expression
    {
        return DB::raw($this->isSqlite()
            ? '(julianday(handled_at) - julianday(started_at)) * 1440'
            : 'TIMESTAMPDIFF(MINUTE, started_at, handled_at)');
    }

    /** Дээд талын үндсэн үзүүлэлтүүд. */
    private function summary(array $f): array
    {
        $row = $this->base($f)->select(
            DB::raw('COUNT(*) as total'),
            DB::raw("SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound"),
            DB::raw("SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound"),
            DB::raw('SUM(CASE WHEN is_missed = 1 THEN 1 ELSE 0 END) as missed'),
            DB::raw('SUM(CASE WHEN is_missed = 1 AND handled_at IS NULL THEN 1 ELSE 0 END) as unhandled'),
            DB::raw('AVG(CASE WHEN is_missed = 0 THEN COALESCE(talk_time, duration) END) as avg_talk'),
            DB::raw('AVG(hold_time) as avg_hold'),
        )->first();

        $handleMinutes = $this->base($f)
            ->where('is_missed', true)
            ->whereNotNull('handled_at')
            ->avg($this->handleMinutesExpr());

        $total = (int) ($row->total ?? 0);
        $missed = (int) ($row->missed ?? 0);

        return [
            'total' => $total,
            'inbound' => (int) ($row->inbound ?? 0),
            'outbound' => (int) ($row->outbound ?? 0),
            'missed' => $missed,
            'unhandled' => (int) ($row->unhandled ?? 0),
            'answer_rate' => $total > 0 ? round(($total - $missed) / $total * 100, 1) : null,
            'avg_talk' => $this->intOrNull($row->avg_talk ?? null),
            'avg_hold' => $this->intOrNull($row->avg_hold ?? null),
            // Алдсан дуудлагыг дунджаар хэдэн минутын дараа барьж авдаг вэ
            'avg_handle_minutes' => $this->intOrNull($handleMinutes),
        ];
    }

    private function intOrNull(mixed $value): ?int
    {
        return $value === null ? null : (int) round((float) $value);
    }

    /**
     * Цагаар хуваарилалт (0-23). Хэзээ дуудлага алддагийг харуулна — ажилтны
     * ээлжийн хуваарь тааруулах гол мэдээлэл.
     */
    private function hourly(array $f): array
    {
        $rows = $this->base($f)
            ->select(
                DB::raw($this->hourSql().' as hour'),
                DB::raw('SUM(CASE WHEN is_missed = 0 THEN 1 ELSE 0 END) as answered'),
                DB::raw('SUM(CASE WHEN is_missed = 1 THEN 1 ELSE 0 END) as missed'),
            )
            ->groupBy(DB::raw($this->hourSql()))
            ->get()
            ->keyBy('hour');

        // 24 цагийг бүтнээр нь буцаана — хоосон цаг ч графикт харагдах ёстой.
        return collect(range(0, 23))->map(fn (int $h) => [
            'hour' => $h,
            'label' => str_pad((string) $h, 2, '0', STR_PAD_LEFT).':00',
            'answered' => (int) ($rows->get($h)->answered ?? 0),
            'missed' => (int) ($rows->get($h)->missed ?? 0),
        ])->all();
    }

    /** Өдрөөр хариулалтын хувь — чанар сайжирч байна уу, мууджиж байна уу. */
    private function daily(array $f): array
    {
        $rows = $this->base($f)
            ->select(
                DB::raw('DATE(started_at) as day'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN is_missed = 1 THEN 1 ELSE 0 END) as missed'),
            )
            ->groupBy(DB::raw('DATE(started_at)'))
            ->orderBy('day')
            ->get();

        return $rows->map(function ($r) {
            $total = (int) $r->total;
            $missed = (int) $r->missed;

            return [
                'day' => (string) $r->day,
                'label' => Carbon::parse((string) $r->day)->format('m/d'),
                'total' => $total,
                'missed' => $missed,
                'answer_rate' => $total > 0 ? round(($total - $missed) / $total * 100, 1) : null,
            ];
        })->all();
    }

    /** Салбар бүрийн гүйцэтгэл. */
    private function byBranch(array $f): array
    {
        $rows = $this->base($f)
            ->select(
                'branch_id',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN is_missed = 1 THEN 1 ELSE 0 END) as missed'),
                DB::raw('SUM(CASE WHEN is_missed = 1 AND handled_at IS NULL THEN 1 ELSE 0 END) as unhandled'),
                DB::raw('AVG(CASE WHEN is_missed = 0 THEN COALESCE(talk_time, duration) END) as avg_talk'),
            )
            ->groupBy('branch_id')
            ->get();

        $names = Branch::pluck('name', 'id');

        return $rows->map(function ($r) use ($names) {
            $total = (int) $r->total;
            $missed = (int) $r->missed;

            return [
                'branch_id' => $r->branch_id,
                // branch_id хоосон = салбар нь танигдаагүй дуудлага
                'branch_name' => $r->branch_id ? ($names[$r->branch_id] ?? '—') : 'Салбар тодорхойгүй',
                'total' => $total,
                'missed' => $missed,
                'unhandled' => (int) $r->unhandled,
                'answer_rate' => $total > 0 ? round(($total - $missed) / $total * 100, 1) : null,
                'avg_talk' => $this->intOrNull($r->avg_talk),
            ];
        })->sortByDesc('total')->values()->all();
    }

    /** Ажилтны гүйцэтгэл — хэн хэдэн дуудлага барьсан бэ. */
    private function byAgent(array $f): array
    {
        $rows = $this->base($f)
            ->whereNotNull('agent')
            ->where('is_missed', false)
            ->select(
                'agent',
                DB::raw('COUNT(*) as answered'),
                DB::raw('AVG(COALESCE(talk_time, duration)) as avg_talk'),
                DB::raw('SUM(COALESCE(talk_time, duration)) as total_talk'),
            )
            ->groupBy('agent')
            ->orderByDesc('answered')
            ->limit(20)
            ->get();

        $extensions = CallExtension::with(['branch:id,name', 'user:id,name'])
            ->get()
            ->keyBy('extension');

        return $rows->map(function ($r) use ($extensions) {
            $ext = $extensions[$r->agent] ?? null;

            return [
                'agent' => (string) $r->agent,
                'user_name' => $ext?->user?->name,
                'branch_name' => $ext?->branch?->name,
                'answered' => (int) $r->answered,
                'avg_talk' => $this->intOrNull($r->avg_talk),
                'total_talk' => (int) ($r->total_talk ?? 0),
            ];
        })->all();
    }

    /**
     * Алдсан дуудлагыг хэрхэн шийдсэн бэ.
     *
     * Хамгийн үнэ цэнэтэй тоо: алдсан дуудлагын хэд нь цаг захиалга болж
     * хувирсан бэ — шууд орлогод хөрвөх үзүүлэлт.
     */
    private function resolutions(array $f): array
    {
        $rows = $this->base($f)
            ->where('is_missed', true)
            ->whereNotNull('resolution')
            ->select('resolution', DB::raw('COUNT(*) as total'))
            ->groupBy('resolution')
            ->pluck('total', 'resolution');

        return collect(Call::RESOLUTIONS)
            ->map(fn (string $label, string $key) => [
                'key' => $key,
                'label' => $label,
                'total' => (int) ($rows[$key] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * Дахин дахин залгасан боловч баригдаагүй дугаарууд.
     *
     * Нэг өдөрт хэд хэдэн удаа залгаад бүгд алдагдсан хүн бол хамгийн их
     * эрсдэлтэй — өөр эмнэлэг рүү явах магадлалтай.
     */
    private function repeatCallers(array $f): array
    {
        return $this->base($f)
            ->where('is_missed', true)
            ->whereNull('handled_at')
            ->whereNotNull('number_norm')
            ->select(
                'number_norm',
                DB::raw('COUNT(*) as attempts'),
                DB::raw('MAX(started_at) as last_call'),
            )
            ->groupBy('number_norm')
            ->havingRaw('COUNT(*) >= 2')
            ->orderByDesc('attempts')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'number' => (string) $r->number_norm,
                'attempts' => (int) $r->attempts,
                'last_call' => $r->last_call ? Carbon::parse($r->last_call)->format('Y-m-d H:i') : null,
            ])
            ->all();
    }
}
