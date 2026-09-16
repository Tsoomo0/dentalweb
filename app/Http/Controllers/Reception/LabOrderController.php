<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\HR\Employee;
use App\Models\LabOrder;
use App\Models\User;
use App\Notifications\LabOrderCreated;
use App\Notifications\LabOrderReturned;
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

        // Салбарын бүх бүртгэлийг нэг удаа өгнө — таб, ажил, лаб, хайлт,
        // хуудаслалт бүгд клиент талд болно (таб солиход сервер рүү явахгүй).
        $orders = LabOrder::with(['branch', 'doctor', 'benders', 'polishers', 'returns.benders', 'returns.polishers', 'creator'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
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
                'bender_employee_id'  => $o->benders->first()?->id,
                'bender_name'         => $o->benders->isNotEmpty() ? implode(', ', LabOrder::employeeNames($o->benders)) : null,
                'polisher_employee_id' => $o->polishers->first()?->id,
                'polisher_name'       => $o->polishers->isNotEmpty() ? implode(', ', LabOrder::employeeNames($o->polishers)) : null,
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
                'return_closed_at'    => $o->return_closed_at?->toDateTimeString(),
                'return_history'      => $o->returnHistory(),
                'notes'               => $o->notes,
                'created_by_name'     => $o->creator?->name,
            ])
            ->all();

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
            ->map(fn ($e) => ['id' => $e->id, 'name' => $e->short_name])
            ->values();

        return Inertia::render('reception/lab-orders/index', [
            'orders'    => $orders,
            'branches'  => $branches,
            'doctors'   => $doctors,
            'employees' => $employees,
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
            'discount_percent'     => 'nullable|integer|min:0|max:100',
            'amount_paid'          => 'nullable|integer|min:0',
            'lab_ready_date'       => 'nullable|date',
            'arrived_date'         => 'nullable|date',
            'pickup_date'          => 'nullable|date',
            'notes'                => 'nullable|string|max:1000',
        ]);

        $validated['branch_id'] = $validated['branch_id'] ?? $this->branchId();
        $validated['created_by'] = Auth::id();

        $labOrder = LabOrder::create($validated);

        // Лаб ажилтнуудад мэдэгдэл явуулна — зөвхөн "Кутикул лаб"-ын захиалга
        // (бусад лабууд гадны лаб бөгөөд лаб портал-аар явахгүй)
        if ($labOrder->lab_name === 'Кутикул лаб') {
            $labUsers = User::whereHas('employee.position', fn ($q) => $q->where('portal', 'lab'))
                ->where('is_active', true)
                ->get();
            foreach ($labUsers as $u) {
                $u->notify(new LabOrderCreated($labOrder->load(['branch', 'doctor'])));
            }
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
            'discount_percent'     => 'sometimes|integer|min:0|max:100',
            'amount_paid'          => 'sometimes|integer|min:0',
            'final_payment_receipt' => 'sometimes|nullable|string|max:100',
            'final_payment_method'  => 'sometimes|nullable|in:cash,card,mobile,storepay',
            'lab_ready_date'       => 'sometimes|nullable|date',
            'arrived_date'         => 'sometimes|nullable|date',
            'pickup_date'          => 'sometimes|nullable|date',
            'is_completed'         => 'sometimes|boolean',
            'notes'                => 'sometimes|nullable|string|max:1000',
        ]);

        if (array_key_exists('is_completed', $validated)) {
            // Идэвхтэй буцаалттай бүртгэлийг дахин нээвэл төлөвүүд зөрчилдөнө
            if (! $validated['is_completed'] && $labOrder->has_open_return) {
                return back()->with('error', 'Идэвхтэй буцаалттай бүртгэлийг дахин нээх боломжгүй. Эхлээд буцаалтыг хаана уу.');
            }
            $validated['completed_at'] = $validated['is_completed'] ? now() : null;

            // Дуусгахад урсгалын алхмууд дутуу үлдвэл нөхөж бөглөнө.
            // Ажлыг ресепшн хүлээж авалгүйгээр үйлчлүүлэгчид өгөх боломжгүй тул
            // эдгээр огноо хоосон үлдвэл явцын түүх тасалдана.
            if ($validated['is_completed']) {
                $today = now()->toDateString();
                if (empty($validated['arrived_date']) && ! $labOrder->arrived_date) {
                    $validated['arrived_date'] = $labOrder->lab_ready_date?->toDateString() ?? $today;
                }
                if (empty($validated['pickup_date']) && ! $labOrder->pickup_date) {
                    $validated['pickup_date'] = $today;
                }
            }
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

    // ── Буцаалт ──────────────────────────────────────────────────────────────
    // Ажил үйлчлүүлэгчийн шүдэнд таарахгүй бол буцаалт болгон лаб руу явуулна.
    // Буцаалтын мөчлөгт төлбөр тооцоо хийгдэхгүй тул amount_*, final_payment_*,
    // is_completed талбаруудад огт хүрэхгүй.

    /** Буцаалт болгож лаб руу явуулах */
    public function sendReturn(Request $request, LabOrder $labOrder): RedirectResponse
    {
        $this->authorizeBranch($labOrder);
        $labOrder->refresh();

        if (! $labOrder->is_completed) {
            return back()->with('error', 'Зөвхөн дууссан бүртгэлийг буцаалт болгоно.');
        }
        if ($labOrder->has_open_return) {
            return back()->with('error', 'Энэ бүртгэл дээр аль хэдийн идэвхтэй буцаалт байна.');
        }

        $validated = $request->validate([
            'return_reason' => 'required|string|max:1000',
        ], [
            'return_reason.required' => 'Буцаалтын шалтгааныг бичнэ үү.',
        ]);

        $attempt  = (int) $labOrder->returns()->max('attempt') + 1;
        $returnAt = now();

        // Түүхэнд шинэ мөчлөг — өмнөх буцаалтууд хэвээр үлдэнэ
        $labOrder->returns()->create([
            'attempt'     => $attempt,
            'reason'      => $validated['return_reason'],
            'returned_at' => $returnAt,
            'returned_by' => Auth::id(),
        ]);

        // lab_orders дээрх багана нь "сүүлийн буцаалтын" хурдан төлөв
        $labOrder->update([
            'return_status'     => LabOrder::RETURN_SENT,
            'return_count'      => $labOrder->countedReturns()->count(),
            'return_reason'     => $validated['return_reason'],
            'returned_at'       => $returnAt,
            'returned_by'       => Auth::id(),
            'return_ready_date' => null,
            'return_closed_at'  => null,
        ]);

        // Зөвхөн "Кутикул лаб" лаб порталаар явна
        if ($labOrder->lab_name === 'Кутикул лаб') {
            $labUsers = User::whereHas('employee.position', fn ($q) => $q->where('portal', 'lab'))
                ->where('is_active', true)
                ->get();
            foreach ($labUsers as $u) {
                $u->notify(new LabOrderReturned($labOrder->fresh()->load(['branch', 'doctor'])));
            }
        }

        return back()->with('success', 'Буцаалт лаб руу явууллаа.');
    }

    /** Лабаас янзлагдаж ирсэн буцаалтыг хүлээж авч хаах */
    public function closeReturn(LabOrder $labOrder): RedirectResponse
    {
        $this->authorizeBranch($labOrder);
        $labOrder->refresh();

        if ($labOrder->return_status !== LabOrder::RETURN_READY) {
            return back()->with('error', 'Лаб энэ буцаалтыг хараахан янзалж дуусгаагүй байна.');
        }

        $closedAt = now();
        $labOrder->currentReturn()->first()?->update(['closed_at' => $closedAt]);

        // Хаагдсан ч буцаалтын бүртгэл түүхэнд бүрэн хэвээр үлдэнэ
        $labOrder->update([
            'return_status'    => LabOrder::RETURN_DONE,
            'return_closed_at' => $closedAt,
        ]);

        return back()->with('success', 'Буцаалт хаагдлаа. Бүртгэл түүхэнд хадгалагдсан.');
    }

    /** Андуурч буцаалт үүсгэсэн бол — зөвхөн лаб гарт авахаас өмнө */
    public function cancelReturn(LabOrder $labOrder): RedirectResponse
    {
        $this->authorizeBranch($labOrder);
        $labOrder->refresh();

        if ($labOrder->return_status !== LabOrder::RETURN_SENT) {
            return back()->with('error', 'Зөвхөн лаб руу явуулсан, хараахан янзлагдаагүй буцаалтыг цуцална.');
        }

        // Мөрийг устгахгүй — "цуцлагдсан" гэж тэмдэглэнэ (тоололд орохгүй)
        $labOrder->currentReturn()->first()?->update(['cancelled_at' => now()]);

        $previous = $labOrder->countedReturns()->first();   // сүүлийн хүчинтэй буцаалт
        $labOrder->update([
            'return_status'     => $previous?->status,
            'return_count'      => $labOrder->countedReturns()->count(),
            'return_reason'     => $previous?->reason,
            'returned_at'       => $previous?->returned_at,
            'returned_by'       => $previous?->returned_by,
            'return_ready_date' => $previous?->ready_date,
            'return_closed_at'  => $previous?->closed_at,
        ]);

        return back()->with('success', 'Буцаалт цуцлагдлаа.');
    }

    private function authorizeBranch(LabOrder $labOrder): void
    {
        if ($this->branchId() && $labOrder->branch_id && $labOrder->branch_id !== $this->branchId()) {
            abort(403);
        }
    }
}
