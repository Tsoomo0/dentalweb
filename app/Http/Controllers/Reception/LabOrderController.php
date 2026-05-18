<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\HR\Employee;
use App\Models\LabOrder;
use App\Models\User;
use App\Notifications\LabOrderCreated;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class LabOrderController extends Controller
{
    private function branchId(): ?int
    {
        return Auth::user()->branch_id;
    }

    public function index(Request $request): Response
    {
        $branchId = $this->branchId();
        $status   = $request->get('status', 'active'); // active | completed | all
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
            'active'         => LabOrder::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->where('is_completed', false)->count(),
            'completed'      => LabOrder::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->where('is_completed', true)->count(),
            'total_due'      => (int) LabOrder::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->where('is_completed', false)->sum('amount_due'),
            'total_paid'     => (int) LabOrder::when($branchId, fn ($q) => $q->where('branch_id', $branchId))->where('is_completed', false)->sum('amount_paid'),
        ];
        $stats['total_outstanding'] = max(0, $stats['total_due'] - $stats['total_paid']);

        $branches = Branch::orderBy('name')->get(['id', 'name']);
        $doctors  = Doctor::where('is_active', true)
            ->when($branchId, fn ($q) => $q->whereHas('branches', fn ($b) => $b->where('branches.id', $branchId)))
            ->orderBy('name')
            ->get(['id', 'name']);

        $employees = Employee::where('status', 'active')
            ->whereHas('position', fn ($q) => $q->where('portal', 'lab'))
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn ($e) => ['id' => $e->id, 'name' => trim($e->last_name.' '.$e->first_name)])
            ->values();

        return Inertia::render('reception/lab-orders/index', [
            'orders'    => $orders,
            'stats'     => $stats,
            'branches'  => $branches,
            'doctors'   => $doctors,
            'employees' => $employees,
            'filters'   => compact('status', 'search'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'order_date'           => 'required|date',
            'sent_to_lab_date'     => 'nullable|date',
            'lab_name'             => 'required|string|max:200',
            'patient_last_name'    => 'nullable|string|max:100',
            'patient_first_name'   => 'required|string|max:100',
            'patient_phone'        => 'nullable|string|max:30',
            'branch_id'            => 'nullable|exists:branches,id',
            'doctor_id'            => 'nullable|exists:doctors,id',
            'work_description'     => 'required|string|max:1000',
            'amount_due'           => 'nullable|integer|min:0',
            'amount_paid'          => 'nullable|integer|min:0',
            'bender_employee_id'   => 'nullable|exists:employees,id',
            'polisher_employee_id' => 'nullable|exists:employees,id',
            'lab_ready_date'       => 'nullable|date',
            'arrived_date'         => 'nullable|date',
            'pickup_date'          => 'nullable|date',
            'notes'                => 'nullable|string|max:1000',
        ]);

        $validated['branch_id'] = $validated['branch_id'] ?? $this->branchId();
        $validated['created_by'] = Auth::id();

        $labOrder = LabOrder::create($validated);

        // Лаб ажилтнуудад мэдэгдэл явуулна (бүх лаб портал хэрэглэгчид — лаб салбараар хуваагдахгүй)
        $labUsers = User::whereHas('employee.position', fn ($q) => $q->where('portal', 'lab'))
            ->where('is_active', true)
            ->get();
        foreach ($labUsers as $u) {
            $u->notify(new LabOrderCreated($labOrder->load(['branch', 'doctor'])));
        }

        return back()->with('success', 'Лаб бүртгэл нэмэгдлээ.');
    }

    public function update(Request $request, LabOrder $labOrder): RedirectResponse
    {
        if ($this->branchId() && $labOrder->branch_id && $labOrder->branch_id !== $this->branchId()) {
            abort(403);
        }

        $validated = $request->validate([
            'order_date'           => 'sometimes|date',
            'sent_to_lab_date'     => 'sometimes|nullable|date',
            'lab_name'             => 'sometimes|string|max:200',
            'patient_last_name'    => 'sometimes|nullable|string|max:100',
            'patient_first_name'   => 'sometimes|string|max:100',
            'patient_phone'        => 'sometimes|nullable|string|max:30',
            'branch_id'            => 'sometimes|nullable|exists:branches,id',
            'doctor_id'            => 'sometimes|nullable|exists:doctors,id',
            'work_description'     => 'sometimes|string|max:1000',
            'amount_due'           => 'sometimes|integer|min:0',
            'amount_paid'          => 'sometimes|integer|min:0',
            'final_payment_receipt' => 'sometimes|nullable|string|max:100',
            'final_payment_method'  => 'sometimes|nullable|in:cash,card,mobile,storepay',
            'bender_employee_id'   => 'sometimes|nullable|exists:employees,id',
            'polisher_employee_id' => 'sometimes|nullable|exists:employees,id',
            'lab_ready_date'       => 'sometimes|nullable|date',
            'arrived_date'         => 'sometimes|nullable|date',
            'pickup_date'          => 'sometimes|nullable|date',
            'is_completed'         => 'sometimes|boolean',
            'notes'                => 'sometimes|nullable|string|max:1000',
        ]);

        if (array_key_exists('is_completed', $validated)) {
            $validated['completed_at'] = $validated['is_completed'] ? now() : null;
        }

        // Дуусгах үед дутуу тооцоо төлбөртэй бол final_payment_at-ыг тэмдэглэнэ
        if (! empty($validated['final_payment_receipt']) && empty($labOrder->final_payment_at)) {
            $validated['final_payment_at'] = now();
        }

        $labOrder->update($validated);

        return back()->with('success', 'Лаб бүртгэл шинэчлэгдлээ.');
    }

    public function destroy(LabOrder $labOrder): RedirectResponse
    {
        if ($this->branchId() && $labOrder->branch_id && $labOrder->branch_id !== $this->branchId()) {
            abort(403);
        }

        $labOrder->delete();

        return back()->with('success', 'Лаб бүртгэл устгагдлаа.');
    }
}
