<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallExtension;
use App\Models\CallPro\CallQueue;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditService;
use App\Services\CallPro\CallSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Админ тал — CallPro интеграцийн тохиргоо.
 *
 * Хоёр mapping-ийг энд удирдана. Хоёулаа заавал бөглөгдсөн байх ёстой,
 * эс бөгөөс дуудлага аль салбарынх нь тодорхойлогдохгүй:
 *
 *   1. Дотуур дугаар → салбар   (хариулсан дуудлагад ашиглана)
 *   2. Queue нэр    → салбар   (АЛДСАН дуудлагад ашиглана — тэнд дотуур
 *                                дугаар огт ирдэггүй)
 */
class CallSettingsController extends Controller
{
    public function index(): Response
    {
        $extensions = CallExtension::with(['branch:id,name', 'user:id,name'])
            ->orderBy('extension')
            ->get()
            ->map(fn (CallExtension $e) => [
                'id' => $e->id,
                'extension' => $e->extension,
                'branch_id' => $e->branch_id,
                'branch_name' => $e->branch?->name,
                'user_id' => $e->user_id,
                'user_name' => $e->user?->name,
                'staff_name' => $e->staff_name,
                'label' => $e->label,
                'is_active' => $e->is_active,
            ]);

        $queues = CallQueue::with('branch:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (CallQueue $q) => [
                'id' => $q->id,
                'name' => $q->name,
                'branch_id' => $q->branch_id,
                'branch_name' => $q->branch?->name,
                'label' => $q->label,
                'is_active' => $q->is_active,
            ]);

        return Inertia::render('admin/calls/settings', [
            'extensions' => $extensions,
            'queues' => $queues,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'staff' => $this->staffOptions(),
            'unmappedAgents' => $this->unmappedAgents(),
            'unmappedQueues' => $this->unmappedQueues(),
            'operations' => CallSettings::all(),
        ]);
    }

    /**
     * CallPro-с ирсэн боловч бүртгэгдээгүй дотуур дугаарууд.
     *
     * `agent` талбарт SIP дугаар ирэх үү, эсвэл өөр "операторын дугаар" ирэх
     * үү гэдэг нь тодорхойгүй байгаа тул бодит датанаас нь харуулна — админ
     * үүнийг хараад шууд салбартаа холбоно.
     */
    private function unmappedAgents(): array
    {
        return Call::query()
            ->whereNotNull('agent')
            ->whereNotIn('agent', CallExtension::pluck('extension'))
            ->select('agent', DB::raw('COUNT(*) as total'), DB::raw('MAX(started_at) as last_seen'))
            ->groupBy('agent')
            ->orderByDesc('total')
            ->limit(50)
            ->get()
            ->map(fn ($r) => [
                'agent' => (string) $r->agent,
                'total' => (int) $r->total,
                'last_seen' => $r->last_seen,
            ])
            ->all();
    }

    /**
     * Ирсэн боловч огт БҮРТГЭГДЭЭГҮЙ queue нэрс.
     *
     * Бүртгэлтэй боловч зориуд салбаргүй болгосон queue (0 — мэдээлэл авах)
     * энд ОРОХГҮЙ — тэр нь зөв тохиргоо. Үнэн анхааруулга дарагдахаас
     * сэргийлнэ.
     */
    private function unmappedQueues(): array
    {
        $known = CallQueue::pluck('name')->map(fn ($n) => CallQueue::key((string) $n))->all();

        return Call::query()
            ->whereNotNull('queue_name')
            ->select('queue_name', DB::raw('COUNT(*) as total'), DB::raw('MAX(started_at) as last_seen'))
            ->groupBy('queue_name')
            ->orderByDesc('total')
            ->limit(50)
            ->get()
            ->reject(fn ($r) => in_array(CallQueue::key((string) $r->queue_name), $known, true))
            ->map(fn ($r) => [
                'queue_name' => (string) $r->queue_name,
                'total' => (int) $r->total,
                'last_seen' => $r->last_seen,
            ])
            ->values()
            ->all();
    }

    /**
     * Дуудлага барьдаг ажилтнууд — ресепшний порталд нэвтрэх эрхтэй хүмүүс.
     *
     * Өмнө нь role-оор (админ + ресепшн) шүүдэг байсан тул оператор жагсаалтад
     * огт гардаггүй, харин дуудлагатай огт хамаагүй админ гарч ирдэг байв.
     *
     * Ресепшн ч, оператор ч дуудлагаа ЭНЭ порталаар хардаг тул «порталд
     * нэвтрэх эрхтэй» гэдэг нь «дуудлага барьдаг» гэсэнтэй ижил утгатай.
     * Албан тушаалын нэрээр шүүхгүй: нэр нь өөрчлөгдөхөд чимээгүй эвдэрнэ.
     *
     * `canAccessPortal` нь `extra_portals`-ийг ч тооцдог бөгөөд түүнийг PHP
     * талд шалгана — SQLite дээр JSON хайлт найдваргүй.
     */
    private function staffOptions(): array
    {
        return User::query()
            // Өвчтөнүүд ч хэрэглэгч учраас эхлээд ажилтнуудаар нарийсгана.
            ->where(fn ($q) => $q->whereHas('employee')
                ->orWhereHas('role', fn ($r) => $r->where('name', 'receptionist')))
            ->with(['role:id,name', 'employee.position:id,name,portal'])
            ->orderBy('name')
            ->get(['id', 'name', 'role_id'])
            ->filter(fn (User $u) => $u->employee?->canAccessPortal('reception')
                || $u->role?->name === 'receptionist')
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                // Нэр давхцвал хэн болохыг ялгахад хэрэгтэй.
                'position' => $u->employee?->position?->name,
            ])
            ->values()
            ->all();
    }

    private function rules(?int $ignoreId = null): array
    {
        return [
            'extension' => [
                'required', 'string', 'max:32',
                'unique:call_extensions,extension'.($ignoreId ? ','.$ignoreId : ''),
            ],
            'branch_id' => 'nullable|exists:branches,id',
            'user_id' => 'nullable|exists:users,id',
            // Нийтийн суурин утас гэх мэт, тодорхой хүнд холбогдохгүй дугаар.
            'staff_name' => 'nullable|string|max:100',
            'label' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Ажилтан сонгосон бол гараар бичсэн нэрийг хаяна.
     *
     * Хоёулаа бөглөгдвөл алдсан дуудлага хэнд очихыг тодорхойлоход зөрчил
     * үүснэ: жагсаалтад нэг нэр, мэдэгдэлд өөр хүн гэж сална.
     *
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    private function resolveStaff(array $data): array
    {
        $data['staff_name'] = filled($data['user_id'] ?? null)
            ? null
            : (filled($data['staff_name'] ?? null) ? trim((string) $data['staff_name']) : null);

        return $data;
    }

    public function storeExtension(Request $request): RedirectResponse
    {
        $data = $this->resolveStaff($request->validate($this->rules()));

        $ext = CallExtension::create([
            ...$data,
            'is_active' => $request->boolean('is_active', true),
        ]);

        AuditService::log('created', $ext, null, $ext->only(['extension', 'branch_id']),
            'CallPro дотуур дугаар нэмэв: '.$ext->extension);

        return back()->with('success', 'Дотуур дугаар нэмэгдлээ.');
    }

    public function updateExtension(Request $request, CallExtension $extension): RedirectResponse
    {
        $data = $this->resolveStaff($request->validate($this->rules($extension->id)));
        $old = $extension->only(['extension', 'branch_id', 'user_id', 'staff_name', 'is_active']);

        $extension->update([
            ...$data,
            'is_active' => $request->boolean('is_active'),
        ]);

        AuditService::log('updated', $extension, $old,
            $extension->only(['extension', 'branch_id', 'user_id', 'staff_name', 'is_active']),
            'CallPro дотуур дугаар зассан: '.$extension->extension);

        return back()->with('success', 'Дотуур дугаар шинэчлэгдлээ.');
    }

    /**
     * Дугаар устгахад өмнөх дуудлагууд УСТАХГҮЙ — тэдгээр нь аль хэдийн
     * branch_id-гаа хадгалсан байдаг. Зөвхөн цаашид ирэх дуудлага
     * танигдахаа болино.
     */
    public function destroyExtension(CallExtension $extension): RedirectResponse
    {
        $number = $extension->extension;

        AuditService::log('deleted', $extension, $extension->only(['extension', 'branch_id']), null,
            'CallPro дотуур дугаар устгав: '.$number);

        $extension->delete();

        return back()->with('success', "Дугаар {$number} устгагдлаа.");
    }

    /**
     * Ажлын цаг, SLA-ийн тохиргоо.
     *
     * Ажлын цаг нь зөвхөн тайланд нөлөөлөхгүй — ажлын цагаас гадуурх алдсан
     * дуудлагад шөнө дунд мэдэгдэл өгөхгүй, SLA сэрэмжлүүлэг ажиллуулахгүй.
     */
    public function updateOperations(Request $request): RedirectResponse
    {
        $data = $request->validate([
            // Гараг бүр өөрийн цагтай: { "1": { "start": "09:00", "end": "20:00" } }
            // Байхгүй гараг нь амралтын өдөр. Нэг ч өдөргүй бол бүх дуудлага
            // «цагаас гадуур» болж, мэдэгдэл бүрэн унтарна.
            'work_hours' => 'required|array|min:1',
            'work_hours.*.start' => 'required|date_format:H:i',
            'work_hours.*.end' => 'required|date_format:H:i|different:work_hours.*.start',
            'sla_minutes' => 'required|integer|min:1|max:1440',
            'notify_after_hours' => 'boolean',
            'report_time' => 'required|date_format:H:i',
        ], [
            'work_hours.required' => 'Дор хаяж нэг ажлын өдөр сонгоно уу.',
            'work_hours.*.end.different' => 'Эхлэх, дуусах цаг ижил байж болохгүй.',
        ]);

        $old = CallSettings::all();

        Setting::set('call_work_hours', json_encode($this->workHours($data['work_hours'])));
        Setting::set('call_sla_minutes', (string) $data['sla_minutes']);
        Setting::set('call_notify_after_hours', $request->boolean('notify_after_hours') ? '1' : '0');
        Setting::set('call_report_time', $data['report_time']);

        AuditService::log('updated', null, $old, CallSettings::all(),
            'Дуудлагын ажлын цаг / SLA тохиргоо зассан');

        return back()->with('success', 'Тохиргоо хадгалагдлаа.');
    }

    /**
     * Хуваарийн түлхүүрийг цэвэрлэнэ.
     *
     * Массивын ТҮЛХҮҮРИЙГ validate дүрмээр хязгаарлах боломжгүй тул 1–7-гоос
     * гадуур гараг ирвэл энд хаяна. Түлхүүрийг мөр болгож хадгална — JSON
     * объект болж хөрвөхөд гараг алдагдахгүй.
     *
     * @param  array<int|string,array{start:string,end:string}>  $input
     * @return array<string,array{start:string,end:string}>
     */
    private function workHours(array $input): array
    {
        $hours = [];

        foreach ($input as $day => $row) {
            $day = (int) $day;

            if ($day >= 1 && $day <= 7) {
                $hours[(string) $day] = ['start' => $row['start'], 'end' => $row['end']];
            }
        }

        ksort($hours);

        return $hours;
    }

    private function queueRules(?int $ignoreId = null): array
    {
        return [
            'name' => [
                'required', 'string', 'max:120',
                'unique:call_queues,name'.($ignoreId ? ','.$ignoreId : ''),
            ],
            'branch_id' => 'nullable|exists:branches,id',
            'label' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Queue бүртгэх. branch_id хоосон орхивол "зориуд салбаргүй" гэсэн утгатай
     * — тэр queue-гээс гарсан алдсан дуудлага зөвхөн АДМИНД харагдана.
     */
    public function storeQueue(Request $request): RedirectResponse
    {
        $data = $request->validate($this->queueRules());

        $queue = CallQueue::create([
            ...$data,
            'is_active' => $request->boolean('is_active', true),
        ]);

        AuditService::log('created', $queue, null, $queue->only(['name', 'branch_id']),
            'CallPro queue нэмэв: '.$queue->name);

        return back()->with('success', 'Queue нэмэгдлээ.');
    }

    public function updateQueue(Request $request, CallQueue $queue): RedirectResponse
    {
        $data = $request->validate($this->queueRules($queue->id));
        $old = $queue->only(['name', 'branch_id', 'is_active']);

        $queue->update([
            ...$data,
            'is_active' => $request->boolean('is_active'),
        ]);

        AuditService::log('updated', $queue, $old, $queue->only(['name', 'branch_id', 'is_active']),
            'CallPro queue зассан: '.$queue->name);

        return back()->with('success', 'Queue шинэчлэгдлээ.');
    }

    public function destroyQueue(CallQueue $queue): RedirectResponse
    {
        $name = $queue->name;

        AuditService::log('deleted', $queue, $queue->only(['name', 'branch_id']), null,
            'CallPro queue устгав: '.$name);

        $queue->delete();

        return back()->with('success', "Queue «{$name}» устгагдлаа.");
    }
}
