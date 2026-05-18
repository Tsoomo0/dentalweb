<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\LabOrder;
use App\Models\User;
use App\Notifications\LabOrderReady;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LabOrderController extends Controller
{
    public function index(Request $request): Response
    {
        // Лаб ажилтан бүх салбарын захиалгыг харна (UI-д салбараар бүлэглэгдэнэ)
        $status   = $request->get('status', 'active');
        $search   = trim((string) $request->get('q', ''));

        $orders = LabOrder::with(['branch', 'doctor', 'bender', 'polisher', 'creator'])
            ->when($status === 'active',    fn ($q) => $q->where('is_completed', false))
            ->when($status === 'completed', fn ($q) => $q->where('is_completed', true))
            ->when($search !== '', fn ($q) => $q->where(fn ($q2) => $q2
                ->where('patient_first_name', 'like', "%{$search}%")
                ->orWhere('patient_last_name', 'like', "%{$search}%")
                ->orWhere('patient_phone', 'like', "%{$search}%")
                ->orWhere('lab_name', 'like', "%{$search}%")
                ->orWhere('work_description', 'like', "%{$search}%")
            ))
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
                'amount_paid'         => (int) $o->amount_paid,
                'outstanding'         => $o->outstanding_amount,
                'final_payment_receipt' => $o->final_payment_receipt,
                'final_payment_method'  => $o->final_payment_method,
                'final_payment_at'      => $o->final_payment_at?->toDateTimeString(),
                'bender_employee_id'  => $o->bender_employee_id,
                'bender_name'         => $o->bender ? trim($o->bender->last_name.' '.$o->bender->first_name) : null,
                'polisher_employee_id' => $o->polisher_employee_id,
                'polisher_name'       => $o->polisher ? trim($o->polisher->last_name.' '.$o->polisher->first_name) : null,
                'lab_ready_date'      => $o->lab_ready_date?->toDateString(),
                'arrived_date'        => $o->arrived_date?->toDateString(),
                'pickup_date'         => $o->pickup_date?->toDateString(),
                'is_completed'        => $o->is_completed,
                'completed_at'        => $o->completed_at?->toDateTimeString(),
                'notes'               => $o->notes,
                'created_by_name'     => $o->creator?->name,
            ])
            ->all();

        $stats = [
            'active'    => LabOrder::where('is_completed', false)->count(),
            'completed' => LabOrder::where('is_completed', true)->count(),
        ];

        $employees = Employee::where('status', 'active')
            ->whereHas('position', fn ($q) => $q->where('portal', 'lab'))
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn ($e) => ['id' => $e->id, 'name' => trim($e->last_name.' '.$e->first_name)])
            ->values();

        return Inertia::render('lab/lab-orders/index', [
            'orders'    => $orders,
            'stats'     => $stats,
            'employees' => $employees,
            'filters'   => compact('status', 'search'),
        ]);
    }

    public function update(Request $request, LabOrder $labOrder): RedirectResponse
    {
        // Лаб ажилтан зөвхөн нугалсан / өнгөлсөн / лаб бэлэн болсон огноо засна.
        // Дуусгах, төлбөр, өвчтөн зэрэг бусад мэдээллийг ресепшн засна.
        $validated = $request->validate([
            'bender_employee_id'   => 'sometimes|nullable|exists:employees,id',
            'polisher_employee_id' => 'sometimes|nullable|exists:employees,id',
            'lab_ready_date'       => 'sometimes|nullable|date',
        ]);

        $wasReady = $labOrder->lab_ready_date !== null;
        $labOrder->update($validated);

        // Хэрэв лаб бэлэн огноог анх удаа тэмдэглэсэн бол ресепшнд мэдэгдэнэ
        // (тухайн салбарын ресепшн + бүх admin, branch-гүй admin-уудыг ч мөн оруулна)
        $nowReady = $labOrder->fresh()->lab_ready_date !== null;
        if (! $wasReady && $nowReady) {
            $receptionUsers = User::where('is_active', true)
                ->whereHas('role', fn ($q) => $q->whereIn('name', ['receptionist', 'admin']))
                ->when($labOrder->branch_id, fn ($q) => $q->where(fn ($q2) => $q2
                    ->where('branch_id', $labOrder->branch_id)
                    ->orWhereNull('branch_id')
                ))
                ->get();
            foreach ($receptionUsers as $u) {
                $u->notify(new LabOrderReady($labOrder->load('branch')));
            }
        }

        return back()->with('success', 'Лаб бүртгэл шинэчлэгдлээ.');
    }

}
