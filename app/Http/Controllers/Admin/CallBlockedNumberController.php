<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallBlockedNumber;
use App\Services\AuditService;
use App\Services\CallPro\PhoneNormalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Админ тал — спам / хамааралгүй дугаарын жагсаалт.
 *
 * Энд байгаа дугаараас ирсэн дуудлага бүртгэгдэх боловч мэдэгдэл өгөхгүй,
 * SLA-д орохгүй, хариулалтын хувийг гажуудуулахгүй.
 */
class CallBlockedNumberController extends Controller
{
    public function index(): Response
    {
        $blocked = CallBlockedNumber::with('creator:id,name')
            ->orderByDesc('created_at')
            ->get();

        // Дуудлагын тоог нэг асуулгаар авна (мөр бүрт асуулга явуулахгүй).
        $counts = Call::whereIn('number_norm', $blocked->pluck('number_norm'))
            ->select('number_norm', DB::raw('COUNT(*) as total'), DB::raw('MAX(started_at) as last_call'))
            ->groupBy('number_norm')
            ->get()
            ->keyBy('number_norm');

        return Inertia::render('admin/calls/blocked', [
            'blocked' => $blocked->map(fn (CallBlockedNumber $b) => [
                'id' => $b->id,
                'number_norm' => $b->number_norm,
                'label' => $b->label,
                'reason' => $b->reason,
                'created_by_name' => $b->creator?->name,
                'created_at' => $b->created_at?->format('Y-m-d H:i'),
                'call_count' => (int) ($counts[$b->number_norm]->total ?? 0),
                'last_call' => $counts[$b->number_norm]->last_call ?? null,
            ])->all(),
            'suggestions' => $this->suggestions(),
        ]);
    }

    /**
     * Спам байж болзошгүй дугаарууд.
     *
     * Олон удаа залгасан боловч ярианы хугацаа нь маш богино (эсвэл огт
     * ярилцаагүй) дугаарууд — ихэвчлэн автомат зар эсвэл буруу дугаар.
     */
    private function suggestions(): array
    {
        return Call::query()
            ->whereNotNull('number_norm')
            ->whereNotIn('number_norm', CallBlockedNumber::pluck('number_norm'))
            ->where('started_at', '>=', now()->subDays(30))
            ->select(
                'number_norm',
                DB::raw('COUNT(*) as total'),
                DB::raw('AVG(COALESCE(talk_time, duration, 0)) as avg_talk'),
                DB::raw('MAX(started_at) as last_call'),
            )
            ->groupBy('number_norm')
            ->havingRaw('COUNT(*) >= 5')
            ->havingRaw('AVG(COALESCE(talk_time, duration, 0)) < 10')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'number_norm' => (string) $r->number_norm,
                'total' => (int) $r->total,
                'avg_talk' => (int) round((float) $r->avg_talk),
                'last_call' => $r->last_call,
            ])
            ->all();
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'number' => 'required|string|max:32',
            'label' => 'nullable|string|max:255',
            'reason' => 'nullable|string|max:255',
        ]);

        $norm = PhoneNormalizer::normalize($data['number']);

        if ($norm === null) {
            return back()->withErrors(['number' => 'Дугаар буруу байна. 8 оронтой дугаар оруулна уу.']);
        }

        if (CallBlockedNumber::where('number_norm', $norm)->exists()) {
            return back()->withErrors(['number' => 'Энэ дугаар аль хэдийн жагсаалтад байна.']);
        }

        $blocked = CallBlockedNumber::create([
            'number_norm' => $norm,
            'label' => $data['label'] ?? null,
            'reason' => $data['reason'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        // Өмнөх дуудлагуудыг ч тэмдэглэнэ — тайлангийн тоо шууд цэвэрлэгдэнэ.
        $affected = Call::where('number_norm', $norm)->update(['is_spam' => true]);

        AuditService::log('created', $blocked, null, ['number' => $norm],
            "Спам дугаар нэмэв: {$norm} ({$affected} дуудлага тэмдэглэгдлээ)");

        return back()->with('success', "{$norm} нэмэгдлээ. Өмнөх {$affected} дуудлага спам болов.");
    }

    /** Жагсаалтаас хасахад өмнөх дуудлагуудын спам тэмдэг мөн арилна. */
    public function destroy(CallBlockedNumber $blocked): RedirectResponse
    {
        $norm = $blocked->number_norm;

        $affected = Call::where('number_norm', $norm)->update(['is_spam' => false]);

        AuditService::log('deleted', $blocked, ['number' => $norm], null,
            "Спам дугаар хаслаа: {$norm} ({$affected} дуудлага сэргэв)");

        $blocked->delete();

        return back()->with('success', "{$norm} хасагдлаа. {$affected} дуудлага сэргэлээ.");
    }

    /** Дуудлагын жагсаалтаас шууд спам болгох товч. */
    public function blockFromCall(Request $request, Call $call): RedirectResponse
    {
        if (blank($call->number_norm)) {
            return back()->withErrors(['number' => 'Энэ дуудлагын дугаар танигдаагүй байна.']);
        }

        CallBlockedNumber::firstOrCreate(
            ['number_norm' => $call->number_norm],
            [
                'label' => $call->caller_name,
                'reason' => $request->input('reason'),
                'created_by' => $request->user()->id,
            ],
        );

        $affected = Call::where('number_norm', $call->number_norm)->update(['is_spam' => true]);

        AuditService::log('updated', $call, null, ['is_spam' => true],
            "Дуудлагын жагсаалтаас спам болгов: {$call->number_norm}");

        return back()->with('success', "{$call->number_norm} спам боллоо ({$affected} дуудлага).");
    }
}
