<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\LabOrder;
use App\Models\User;
use App\Notifications\LabOrderReady;
use App\Notifications\LabOrderReturnFixed;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LabOrderController extends Controller
{
    public function index(Request $request): Response
    {
        // Лаб ажилтан бүх салбарын захиалгыг харна.
        // Бүгдийг нэг удаа өгнө — таб, ажил, салбар, хайлт, хуудаслалт бүгд
        // клиент талд болно (таб солиход сервер рүү явахгүй).
        // Лаб портал зөвхөн "Кутикул лаб"-ын ажлуудыг харна (бусад нь гадны лаб)
        $orders = LabOrder::with([
            'branch', 'doctor', 'benders', 'polishers', 'creator',
            'returns.benders', 'returns.polishers',
            'currentReturn.benders', 'currentReturn.polishers',
        ])
            ->where('lab_name', 'Кутикул лаб')
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($o) => [
                'id'                  => $o->id,
                'order_date'          => $o->order_date?->toDateString(),
                'sent_to_lab_date'    => $o->sent_to_lab_date?->toDateString(),
                'lab_name'            => $o->lab_name,
                'patient_last_name'   => $o->patient_last_name,
                'patient_first_name'  => $o->patient_first_name,
                'patient_phone'       => $o->patient_phone,
                'branch_id'           => $o->branch_id,
                'branch_name'         => $o->branch?->name,
                'doctor_id'           => $o->doctor_id,
                'doctor_name'         => $o->doctor?->name,
                'work_description'    => $o->work_description,
                'amount_due'          => (int) $o->amount_due,
                'discount_percent'    => (int) $o->discount_percent,
                'effective_due'       => (int) $o->effective_due,
                'amount_paid'         => (int) $o->amount_paid,
                'outstanding'         => $o->outstanding_amount,
                'final_payment_receipt' => $o->final_payment_receipt,
                'final_payment_method'  => $o->final_payment_method,
                'final_payment_at'      => $o->final_payment_at?->toDateTimeString(),
                'benders'             => $o->benders->map(fn ($e) => ['id' => $e->id, 'name' => $e->short_name])->values(),
                'polishers'           => $o->polishers->map(fn ($e) => ['id' => $e->id, 'name' => $e->short_name])->values(),
                'lab_ready_date'      => $o->lab_ready_date?->toDateString(),
                'arrived_date'        => $o->arrived_date?->toDateString(),
                'pickup_date'         => $o->pickup_date?->toDateString(),
                'is_completed'        => $o->is_completed,
                'completed_at'        => $o->completed_at?->toDateTimeString(),
                // ── Буцаалт ─────────────────────────────────────────────────
                'return_status'       => $o->return_status,
                'return_count'        => (int) $o->return_count,
                'return_reason'       => $o->return_reason,
                'returned_at'         => $o->returned_at?->toDateTimeString(),
                'return_ready_date'   => $o->return_ready_date?->toDateString(),
                'return_history'      => $o->returnHistory(),
                // Одоо явагдаж байгаа мөчлөгийн ажилтнууд (сонголтыг сэргээхэд)
                'return_benders'      => $o->currentReturn
                    ? $o->currentReturn->benders->map(fn ($e) => ['id' => $e->id, 'name' => $e->short_name])->values()
                    : collect(),
                'return_polishers'    => $o->currentReturn
                    ? $o->currentReturn->polishers->map(fn ($e) => ['id' => $e->id, 'name' => $e->short_name])->values()
                    : collect(),
                'notes'               => $o->notes,
                'created_by_name'     => $o->creator?->name,
            ])
            ->all();

        $employees = Employee::where('status', 'active')
            ->whereHas('position', fn ($q) => $q->where('portal', 'lab'))
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn ($e) => ['id' => $e->id, 'name' => $e->short_name])
            ->values();

        return Inertia::render('lab/lab-orders/index', [
            'orders'    => $orders,
            'employees' => $employees,
        ]);
    }

    public function update(Request $request, LabOrder $labOrder): RedirectResponse
    {
        // Лаб ажилтан зөвхөн нугалсан / өнгөлсөн (олон) / лаб бэлэн болсон огноо засна.
        // Дуусгах, төлбөр, өвчтөн зэрэг бусад мэдээллийг ресепшн засна.
        $validated = $request->validate([
            'bender_ids'     => 'sometimes|array',
            'bender_ids.*'   => 'integer|exists:employees,id',
            'polisher_ids'   => 'sometimes|array',
            'polisher_ids.*' => 'integer|exists:employees,id',
            'lab_ready_date' => 'sometimes|nullable|date',
            // Буцаалтын мөчлөг
            'return_bender_ids'     => 'sometimes|array',
            'return_bender_ids.*'   => 'integer|exists:employees,id',
            'return_polisher_ids'   => 'sometimes|array',
            'return_polisher_ids.*' => 'integer|exists:employees,id',
            'return_ready_date'     => 'sometimes|nullable|date',
        ]);

        // Ресепшн хаах хүртэл лаб буцаалтын мэдээллээ засаж болно (алдаа залруулах)
        $labOrder->refresh();
        $isReturnWork = $labOrder->has_open_return;

        // ── Буцаалтын ажил ───────────────────────────────────────────────────
        // Ямар ч төлбөр тооцоо хийгдэхгүй — зөвхөн ажилтан ба янзалж дууссан огноо.
        if ($request->hasAny(['return_bender_ids', 'return_polisher_ids', 'return_ready_date'])) {
            // Relation property биш query — нэг хүсэлтэд олон удаа дуудагдвал
            // кэшлэгдсэн хуучин мөчлөг рүү бичихээс сэргийлнэ
            $currentReturn = $labOrder->currentReturn()->first();
            if (! $isReturnWork || ! $currentReturn) {
                return back()->with('error', 'Энэ захиалга дээр янзлах буцаалт байхгүй байна.');
            }

            // Ажилтныг тухайн мөчлөгт нь хадгална — өмнөх буцаалтынх хэвээр үлдэнэ
            if ($request->has('return_bender_ids')) {
                $currentReturn->benders()->sync($validated['return_bender_ids'] ?? []);
            }
            if ($request->has('return_polisher_ids')) {
                $currentReturn->polishers()->sync($validated['return_polisher_ids'] ?? []);
            }

            if ($request->has('return_ready_date')) {
                $readyDate = $validated['return_ready_date'] ?? null;
                $currentReturn->update(['ready_date' => $readyDate]);
                $labOrder->update([
                    'return_ready_date' => $readyDate,
                    // Огноо тэмдэглэгдмэгц ресепшн рүү буцна
                    'return_status' => $readyDate ? LabOrder::RETURN_READY : LabOrder::RETURN_SENT,
                ]);

                if ($readyDate) {
                    $this->notifyReception($labOrder->fresh(), new LabOrderReturnFixed($labOrder->fresh()->load('branch')));
                }
            }

            return back()->with('success', 'Буцаалтын ажил шинэчлэгдлээ.');
        }

        // ── Энгийн мөчлөг ────────────────────────────────────────────────────
        // Дууссан захиалгын анхны бүртгэлийг лаб талаас өөрчлөхийг хориглоно
        // (цалингийн тооцоо энэ өгөгдөл дээр тулгуурладаг).
        if ($labOrder->is_completed) {
            return back()->with('error', 'Дууссан захиалгыг лаб талаас засах боломжгүй.');
        }

        if ($request->has('bender_ids')) {
            $labOrder->benders()->sync($validated['bender_ids'] ?? []);
        }
        if ($request->has('polisher_ids')) {
            $labOrder->polishers()->sync($validated['polisher_ids'] ?? []);
        }

        $wasReady = $labOrder->lab_ready_date !== null;
        if ($request->has('lab_ready_date')) {
            $labOrder->update(['lab_ready_date' => $validated['lab_ready_date'] ?? null]);
        }

        // Хэрэв лаб бэлэн огноог анх удаа тэмдэглэсэн бол ресепшнд мэдэгдэнэ
        $nowReady = $labOrder->fresh()->lab_ready_date !== null;
        if (! $wasReady && $nowReady) {
            $this->notifyReception($labOrder, new LabOrderReady($labOrder->load('branch')));
        }

        return back()->with('success', 'Лаб бүртгэл шинэчлэгдлээ.');
    }

    /**
     * Тухайн салбарын ресепшн + admin (салбаргүй admin-уудыг ч оруулна).
     */
    private function notifyReception(LabOrder $labOrder, $notification): void
    {
        $receptionUsers = User::where('is_active', true)
            ->whereHas('role', fn ($q) => $q->whereIn('name', ['receptionist', 'admin']))
            ->when($labOrder->branch_id, fn ($q) => $q->where(fn ($q2) => $q2
                ->where('branch_id', $labOrder->branch_id)
                ->orWhereNull('branch_id')
            ))
            ->get();

        foreach ($receptionUsers as $u) {
            $u->notify($notification);
        }
    }

}
