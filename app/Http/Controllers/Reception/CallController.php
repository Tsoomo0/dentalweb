<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use App\Services\AuditService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ресепшн — өөрийн салбарын дуудлага.
 *
 * Админаас ялгаатай гурван зарчим:
 *   1. ЗӨВХӨН өөрийн салбарын дуудлага харагдана. Салбар нь тодорхойгүй
 *      дуудлага (мэдээллийн дугаар, IVR дээр таслагдсан) энд ОРОХГҮЙ —
 *      тэдгээр нь админы хариуцах зүйл.
 *   2. Анхдагч харагдац нь «шийдвэрлэх ёстой» жагсаалт. Ресепшний ажил бол
 *      түүхийг ухах биш, эргэж холбогдох хүнээ олох.
 *   3. Спам дугаар бүртгэх эрхгүй — тэр нь бүх салбарт нөлөөлдөг тул админд.
 */
class CallController extends Controller
{
    private function branchId(): ?int
    {
        return Auth::user()->branch_id;
    }

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $calls = $this->query($filters)
            ->with(['user:id,name', 'handler:id,name'])
            ->orderByDesc('started_at')
            ->paginate($filters['per_page'])
            ->withQueryString()
            ->through(fn (Call $c) => $this->present($c));

        return Inertia::render('reception/calls/index', [
            'calls' => $calls,
            'filters' => $filters,
            'resolutions' => Call::RESOLUTIONS,
            'stats' => $this->stats(),
            'branchName' => Auth::user()->branch?->name,
            'me' => $this->me(),
        ]);
    }

    /**
     * Нэвтэрсэн ажилтны өөрийн дотуур дугаар ба өнөөдрийн гүйцэтгэл.
     *
     * Дугаар нь `call_extensions` дээр ажилтантай холбогдсон байх ёстой. Хэрэв
     * холбогдоогүй бол ажилтан «яагаад миний хариулсан дуудлага харагдахгүй
     * байна вэ» гэж эргэлзэхээс өмнө шалтгааныг нь хуудсан дээрээ хардаг.
     */
    private function me(): array
    {
        $user = Auth::user();

        $extensions = CallExtension::with('branch:id,name')
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('extension')
            ->get();

        $numbers = $extensions->pluck('extension')->all();

        $answeredToday = $numbers === [] ? 0 : Call::whereIn('agent', $numbers)
            ->where('is_missed', false)
            ->whereDate('started_at', Carbon::today())
            ->count();

        return [
            'extensions' => $extensions->map(fn (CallExtension $e) => [
                'extension' => $e->extension,
                'label' => $e->label,
                'branch_name' => $e->branch?->name,
                // Дугаар нь ажилтны салбараас өөр салбарт бүртгэгдсэн бол
                // хариулсан дуудлага нь энэ жагсаалтад орж ирэхгүй.
                'branch_mismatch' => $e->branch_id !== null && $e->branch_id !== $user->branch_id,
            ])->all(),
            'answered_today' => $answeredToday,
        ];
    }

    /**
     * Шинэ алдсан дуудлага ирсэн эсэхийг шалгах хөнгөн цэг.
     *
     * Хуудсыг бүтнээр нь дахин ачаалалгүйгээр тоо шинэчлэгдэнэ. Ресепшн
     * дэлгэцээ нээлттэй орхидог тул энэ нь мэдэгдлийн хажуугаар ажилладаг
     * хоёр дахь баталгаа.
     */
    public function poll(): JsonResponse
    {
        return response()->json([
            ...$this->stats(),
            'alerts' => $this->alerts(),
        ]);
    }

    /**
     * Дэлгэц дээр цонхоор сануулах шинэ алдсан дуудлагууд.
     *
     * Зөвхөн сүүлийн цагийнхыг өгнө: өчигдрийн барьж амжаагүй дуудлагад
     * цонх дэлгэх нь ажил тасалдуулах болохоос сануулга биш. Хуучин
     * дуудлага жагсаалт болон badge дээрээ хэвээр харагдана.
     */
    private function alerts(): array
    {
        return Call::query()
            ->where('branch_id', $this->branchId() ?? 0)
            ->unhandledMissed()
            ->where('started_at', '>=', now()->subHour())
            ->orderByDesc('started_at')
            ->limit(5)
            ->get(['id', 'number', 'queue_name', 'started_at'])
            ->map(fn (Call $c) => [
                'id' => $c->id,
                'number' => $c->number,
                'queue_name' => $c->queue_name,
                'started_at' => $c->started_at?->format('H:i'),
                'waited_minutes' => $c->started_at ? (int) $c->started_at->diffInMinutes(now()) : 0,
            ])
            ->all();
    }

    /** @return array<string,mixed> */
    private function filters(Request $request): array
    {
        $view = $request->query('view');

        return [
            // Анхдагчаар шийдвэрлэх ёстой дуудлагууд — ресепшний өдөр тутмын ажил
            'view' => in_array($view, ['todo', 'missed', 'mine', 'all'], true) ? $view : 'todo',
            'from' => $request->query('from') ?: Carbon::now()->subDays(7)->toDateString(),
            'to' => $request->query('to') ?: Carbon::now()->toDateString(),
            'search' => trim((string) $request->query('search')),
            'per_page' => $this->perPage($request),
        ];
    }

    /** Нэг хуудсанд хэдэн мөр — хэрэглэгчийн утгыг хязгаарлана. */
    private function perPage(Request $request): int
    {
        $value = (int) $request->query('per_page', 10);

        return in_array($value, [10, 25, 50, 100], true) ? $value : 10;
    }

    /** @return array<int,string> */
    private function myExtensionNumbers(): array
    {
        return CallExtension::where('user_id', Auth::id())
            ->where('is_active', true)
            ->pluck('extension')
            ->all();
    }

    private function query(array $f): Builder
    {
        $branchId = $this->branchId();

        return Call::query()
            // Салбаргүй ажилтан бүх салбарыг харах ёсгүй — юу ч харуулахгүй нь
            // буруу датаг харуулснаас аюулгүй.
            ->where('branch_id', $branchId ?? 0)
            ->where('is_spam', false)
            ->when($f['view'] === 'todo', fn ($q) => $q->unhandledMissed())
            ->when($f['view'] === 'missed', fn ($q) => $q->where('is_missed', true))
            // Өөрийн дотуур дугаараар хариулсан дуудлагууд. Дугаар холбоогүй
            // ажилтанд хоосон жагсаалт гарна — бусдын дуудлагыг өөрийнх гэж
            // үзүүлэхээс хоосон харуулах нь зөв.
            ->when($f['view'] === 'mine', fn ($q) => $q->whereIn('agent', $this->myExtensionNumbers()))
            // «Шийдвэрлэх» жагсаалт огнооны шүүлтээс хамаарахгүй: 10 хоногийн
            // өмнөх барьж амжаагүй дуудлага нүднээс далд үлдэх ёсгүй.
            ->when($f['view'] !== 'todo', function ($q) use ($f) {
                $q->whereDate('started_at', '>=', $f['from'])
                    ->whereDate('started_at', '<=', $f['to']);
            })
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

    /** Толгойн тоонууд — салбарын өнөөдрийн байдал. */
    private function stats(): array
    {
        $branchId = $this->branchId();

        $base = fn () => Call::where('branch_id', $branchId ?? 0)->where('is_spam', false);

        $today = $base()->whereDate('started_at', Carbon::today());

        $row = $today->select(
            DB::raw('COUNT(*) as total'),
            DB::raw('SUM(CASE WHEN is_missed = 1 THEN 1 ELSE 0 END) as missed'),
            DB::raw('SUM(CASE WHEN is_missed = 0 THEN 1 ELSE 0 END) as answered'),
        )->first();

        $answered = (int) ($row->answered ?? 0);
        $missed = (int) ($row->missed ?? 0);
        $graded = $answered + $missed;

        return [
            // Шийдвэрлэх ёстой нь өдрөөр хязгаарлагдахгүй — өчигдрийнх ч орно
            'todo' => (clone $base())->unhandledMissed()->count(),
            'today_total' => (int) ($row->total ?? 0),
            'today_missed' => $missed,
            'today_answer_rate' => $graded > 0 ? round($answered / $graded * 100, 1) : null,
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
            'agent' => $c->agent,
            'user_name' => $c->user?->name,
            'started_at' => $c->started_at?->format('Y-m-d H:i'),
            'waited_minutes' => $c->is_missed && $c->handled_at === null && $c->started_at
                ? (int) $c->started_at->diffInMinutes(now())
                : null,
            'duration' => $c->duration,
            'talk_time' => $c->talk_time,
            'is_missed' => $c->is_missed,
            'is_after_hours' => $c->is_after_hours,
            'handled_at' => $c->handled_at?->format('Y-m-d H:i'),
            'handled_by_name' => $c->handler?->name,
            'resolution' => $c->resolution,
            'resolution_label' => $c->resolution_label,
            'resolution_note' => $c->resolution_note,
            'has_recording' => $c->hasRecording(),
        ];
    }

    /**
     * Дуудлагыг өөрийн салбарынх эсэхийг шалгана.
     *
     * URL-аар өөр салбарын дуудлагын id оруулж тэмдэглэх боломжгүй байх ёстой.
     */
    private function assertOwnBranch(Call $call): void
    {
        abort_unless(
            $call->branch_id !== null && $call->branch_id === $this->branchId(),
            403,
            'Энэ дуудлага таны салбарынх биш байна.',
        );
    }

    public function resolve(Request $request, Call $call): RedirectResponse
    {
        $this->assertOwnBranch($call);

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

    /** Алдаатай тэмдэглэсэн бол буцаана — дуудлага дахин жагсаалтад орно. */
    public function unresolve(Call $call): RedirectResponse
    {
        $this->assertOwnBranch($call);

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
