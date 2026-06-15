<?php

namespace App\Http\Controllers\Admin;

use App\Exports\LabOrderExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\LabOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class LabOrderController extends Controller
{
    public function exportExcel(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $branchId = $request->integer('branch');
        $status   = $request->get('status', 'all');
        $search   = trim((string) $request->get('q', ''));

        $orders = LabOrder::with(['branch', 'doctor', 'bender', 'polisher', 'creator'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($status === 'active',    fn ($q) => $q->where('is_completed', false))
            ->when($status === 'completed', fn ($q) => $q->where('is_completed', true))
            ->when($search !== '', fn ($q) => $q->where(fn ($q2) => $q2
                ->where('patient_first_name', 'like', "%{$search}%")
                ->orWhere('patient_last_name', 'like', "%{$search}%")
                ->orWhere('patient_phone', 'like', "%{$search}%")
                ->orWhere('lab_name', 'like', "%{$search}%")
                ->orWhere('work_description', 'like', "%{$search}%")
                ->orWhere('final_payment_receipt', 'like', "%{$search}%")
            ))
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($o) => [
                'id'                    => $o->id,
                'order_date'            => $o->order_date?->toDateString(),
                'sent_to_lab_date'      => $o->sent_to_lab_date?->toDateString(),
                'lab_name'              => $o->lab_name,
                'patient'               => trim(($o->patient_last_name ? $o->patient_last_name.' ' : '').$o->patient_first_name),
                'patient_phone'         => $o->patient_phone,
                'branch_name'           => $o->branch?->name,
                'doctor_name'           => $o->doctor?->name,
                'work_description'      => $o->work_description,
                'amount_due'            => (int) $o->amount_due,
                'discount_percent'      => (int) $o->discount_percent,
                'effective_due'         => (int) $o->effective_due,
                'amount_paid'           => (int) $o->amount_paid,
                'outstanding'           => $o->outstanding_amount,
                'bender_name'           => $o->bender ? trim($o->bender->last_name.' '.$o->bender->first_name) : null,
                'polisher_name'         => $o->polisher ? trim($o->polisher->last_name.' '.$o->polisher->first_name) : null,
                'lab_ready_date'        => $o->lab_ready_date?->toDateString(),
                'arrived_date'          => $o->arrived_date?->toDateString(),
                'pickup_date'           => $o->pickup_date?->toDateString(),
                'final_payment_receipt' => $o->final_payment_receipt,
                'final_payment_method'  => $o->final_payment_method,
                'final_payment_at'      => $o->final_payment_at?->toDateString(),
                'is_completed'          => $o->is_completed ? 'Дууссан' : 'Идэвхтэй',
                'completed_at'          => $o->completed_at?->toDateString(),
                'notes'                 => $o->notes,
                'created_by_name'       => $o->creator?->name,
            ]);

        return Excel::download(new LabOrderExport($orders), 'lab-orders-'.now()->format('Y-m-d').'.xlsx');
    }

    public function index(Request $request): Response
    {
        $branchId = $request->integer('branch');
        $status   = $request->get('status', 'all'); // active | completed | all
        $search   = trim((string) $request->get('q', ''));

        $orders = LabOrder::with(['branch', 'doctor', 'bender', 'polisher', 'creator'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($status === 'active',    fn ($q) => $q->where('is_completed', false))
            ->when($status === 'completed', fn ($q) => $q->where('is_completed', true))
            ->when($search !== '', fn ($q) => $q->where(fn ($q2) => $q2
                ->where('patient_first_name', 'like', "%{$search}%")
                ->orWhere('patient_last_name', 'like', "%{$search}%")
                ->orWhere('patient_phone', 'like', "%{$search}%")
                ->orWhere('lab_name', 'like', "%{$search}%")
                ->orWhere('work_description', 'like', "%{$search}%")
                ->orWhere('final_payment_receipt', 'like', "%{$search}%")
            ))
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($o) => [
                'id'                    => $o->id,
                'order_date'            => $o->order_date?->toDateString(),
                'sent_to_lab_date'      => $o->sent_to_lab_date?->toDateString(),
                'lab_name'              => $o->lab_name,
                'patient_last_name'     => $o->patient_last_name,
                'patient_first_name'    => $o->patient_first_name,
                'patient_phone'         => $o->patient_phone,
                'branch_id'             => $o->branch_id,
                'branch_name'           => $o->branch?->name,
                'doctor_id'             => $o->doctor_id,
                'doctor_name'           => $o->doctor?->name,
                'work_description'      => $o->work_description,
                'amount_due'            => (int) $o->amount_due,
                'discount_percent'      => (int) $o->discount_percent,
                'effective_due'         => (int) $o->effective_due,
                'amount_paid'           => (int) $o->amount_paid,
                'outstanding'           => $o->outstanding_amount,
                'final_payment_receipt' => $o->final_payment_receipt,
                'final_payment_method'  => $o->final_payment_method,
                'final_payment_at'      => $o->final_payment_at?->toDateTimeString(),
                'bender_name'           => $o->bender ? trim($o->bender->last_name.' '.$o->bender->first_name) : null,
                'polisher_name'         => $o->polisher ? trim($o->polisher->last_name.' '.$o->polisher->first_name) : null,
                'lab_ready_date'        => $o->lab_ready_date?->toDateString(),
                'arrived_date'          => $o->arrived_date?->toDateString(),
                'pickup_date'           => $o->pickup_date?->toDateString(),
                'is_completed'          => $o->is_completed,
                'completed_at'          => $o->completed_at?->toDateTimeString(),
                'notes'                 => $o->notes,
                'created_by_name'       => $o->creator?->name,
            ])
            ->all();

        // Global stats (бүх лаб ажил)
        $stats = [
            'active'            => LabOrder::where('is_completed', false)->count(),
            'completed'         => LabOrder::where('is_completed', true)->count(),
            'total_due'         => (int) LabOrder::sum('amount_due'),
            'total_paid'        => (int) LabOrder::sum('amount_paid'),
            'total_outstanding' => (int) LabOrder::where('is_completed', false)->whereColumn('amount_paid', '<', 'amount_due')->selectRaw('SUM(amount_due - amount_paid) as t')->value('t') ?? 0,
            'final_paid_count'  => LabOrder::whereNotNull('final_payment_at')->count(),
        ];

        $branches = Branch::orderBy('name')->get(['id', 'name']);

        return Inertia::render('admin/lab-orders/index', [
            'orders'   => $orders,
            'stats'    => $stats,
            'branches' => $branches,
            'filters'  => [
                'status' => $status,
                'search' => $search,
                'branch' => $branchId,
            ],
        ]);
    }
}
