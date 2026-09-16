<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Админ тал — бүх салбарын дуудлагын бүртгэл.
 *
 * Ресепшн зөвхөн өөрийн салбарынхаа дуудлагыг хардаг бол админ бүгдийг хараад
 * салбараар нь шүүнэ.
 */
class CallController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $calls = $this->query($filters)
            ->with(['branch:id,name', 'user:id,name', 'handler:id,name'])
            ->orderByDesc('started_at')
            ->paginate($filters['per_page'])
            ->withQueryString()
            ->through(fn (Call $c) => $this->present($c));

        return Inertia::render('admin/calls/index', [
            'calls' => $calls,
            'filters' => $filters,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'resolutions' => Call::RESOLUTIONS,
            'stats' => $this->stats($filters),
        ]);
    }

    /** @return array<string,mixed> */
    private function filters(Request $request): array
    {
        return [
            'from' => $request->query('from') ?: Carbon::now()->subDays(7)->toDateString(),
            'to' => $request->query('to') ?: Carbon::now()->toDateString(),
            'branch_id' => $request->query('branch_id'),
            'direction' => $request->query('direction'),
            'status' => $request->query('status'),        // missed | answered | unhandled
            'search' => trim((string) $request->query('search')),
            'agent' => $request->query('agent'),
            'per_page' => $this->perPage($request),
        ];
    }

    /**
     * Нэг хуудсанд хэдэн мөр. Хэрэглэгчийн өгсөн утгыг хязгаарлана —
     * ?per_page=100000 гэж бичээд серверийг унагаах боломжгүй байх ёстой.
     */
    private function perPage(Request $request): int
    {
        $value = (int) $request->query('per_page', 10);

        return in_array($value, [10, 25, 50, 100], true) ? $value : 10;
    }

    private function query(array $f)
    {
        return Call::query()
            ->when($f['from'], fn ($q, $v) => $q->whereDate('started_at', '>=', $v))
            ->when($f['to'], fn ($q, $v) => $q->whereDate('started_at', '<=', $v))
            ->when($f['branch_id'], fn ($q, $v) => $q->where('branch_id', $v))
            ->when($f['direction'], fn ($q, $v) => $q->where('direction', $v))
            ->when($f['agent'], fn ($q, $v) => $q->where('agent', $v))
            ->when($f['status'] === 'missed', fn ($q) => $q->where('is_missed', true))
            ->when($f['status'] === 'answered', fn ($q) => $q->where('is_missed', false))
            ->when($f['status'] === 'unhandled', fn ($q) => $q->unhandledMissed())
            ->when($f['status'] === 'after_hours', fn ($q) => $q->where('is_after_hours', true))
            ->when($f['status'] === 'spam', fn ($q) => $q->where('is_spam', true))
            ->when($f['search'], function ($q, $v) {
                $digits = preg_replace('/\D+/', '', $v) ?? '';
                $q->where(function ($w) use ($v, $digits) {
                    $w->where('caller_name', 'like', "%{$v}%");
                    if ($digits !== '') {
                        $w->orWhere('number', 'like', "%{$digits}%")
                            ->orWhere('number_norm', 'like', "%{$digits}%");
                    }
                });
            });
    }

    /** Дээд талын хураангуй — хариулалтын хувь нь хамгийн чухал үзүүлэлт. */
    private function stats(array $f): array
    {
        // Спам дуудлага хариулалтын хувийг гажуудуулах ёсгүй тул түүнийг
        // тооцооноос хасна (тайлангийн хуудастай ижил зарчим).
        $row = $this->query($f)
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN is_spam = 0 AND is_missed = 1 THEN 1 ELSE 0 END) as missed'),
                DB::raw('SUM(CASE WHEN is_spam = 0 AND is_missed = 0 THEN 1 ELSE 0 END) as answered'),
                DB::raw('SUM(CASE WHEN is_spam = 0 AND is_missed = 1 AND handled_at IS NULL THEN 1 ELSE 0 END) as unhandled'),
                DB::raw('AVG(CASE WHEN is_missed = 0 THEN COALESCE(talk_time, duration) END) as avg_duration'),
            )
            ->first();

        $missed = (int) ($row->missed ?? 0);
        $answered = (int) ($row->answered ?? 0);
        $graded = $missed + $answered;

        return [
            'total' => (int) ($row->total ?? 0),
            'missed' => $missed,
            'unhandled' => (int) ($row->unhandled ?? 0),
            'answer_rate' => $graded > 0 ? round($answered / $graded * 100, 1) : null,
            'avg_duration' => $row->avg_duration !== null ? (int) round((float) $row->avg_duration) : null,
        ];
    }

    private function present(Call $c): array
    {
        return [
            'id' => $c->id,
            'number' => $c->number,
            'caller_name' => $c->caller_name,
            'direction' => $c->direction,
            'call_status' => $c->call_status,
            'queue_name' => $c->queue_name,
            'agent' => $c->agent,
            'branch_name' => $c->branch?->name,
            'user_name' => $c->user?->name,
            'started_at' => $c->started_at?->format('Y-m-d H:i:s'),
            'duration' => $c->duration,
            'talk_time' => $c->talk_time,
            'hold_time' => $c->hold_time,
            'business_number' => $c->business_number,
            'is_missed' => $c->is_missed,
            'is_after_hours' => $c->is_after_hours,
            'is_spam' => $c->is_spam,
            'handled_at' => $c->handled_at?->format('Y-m-d H:i'),
            'handled_by_name' => $c->handler?->name,
            'resolution' => $c->resolution,
            'resolution_label' => $c->resolution_label,
            'resolution_note' => $c->resolution_note,
            // Бичлэгийн жинхэнэ URL-ийг хөтөч рүү өгөхгүй — өөрийн сервер
            // дээгүүр дамжуулж, хэн сонссоныг бүртгэнэ.
            'has_recording' => $c->hasRecording(),
        ];
    }

    /** Алдсан дуудлагыг шийдвэрлэсэн гэж тэмдэглэх (админ ч хийж болно). */
    public function resolve(Request $request, Call $call): RedirectResponse
    {
        $data = $request->validate([
            'resolution' => 'required|in:'.implode(',', array_keys(Call::RESOLUTIONS)),
            'resolution_note' => 'nullable|string|max:2000',
        ]);

        $old = $call->only(['resolution', 'handled_at']);

        $call->update([
            ...$data,
            'handled_at' => now(),
            'handled_by' => $request->user()->id,
        ]);

        AuditService::log('updated', $call, $old, $call->only(['resolution', 'handled_at']),
            'Дуудлага шийдвэрлэв: '.$call->number.' — '.$call->resolution_label);

        return back()->with('success', 'Тэмдэглэл хадгалагдлаа.');
    }

    /** Тэмдэглэлийг буцаах (алдаатай тэмдэглэсэн тохиолдолд). */
    public function unresolve(Call $call): RedirectResponse
    {
        $old = $call->only(['resolution', 'handled_at']);

        $call->update([
            'resolution' => null,
            'resolution_note' => null,
            'handled_at' => null,
            'handled_by' => null,
        ]);

        AuditService::log('updated', $call, $old, null,
            'Дуудлагын тэмдэглэл буцаав: '.$call->number);

        return back()->with('success', 'Тэмдэглэл буцаагдлаа.');
    }
}
