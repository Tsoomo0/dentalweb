<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\HR\Equipment;
use App\Models\HR\EquipmentAssignment;
use App\Models\Setting;
use App\Notifications\EquipmentAssigned;
use App\Notifications\EquipmentReturnedByAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class EquipmentController extends Controller
{
    public function index(): Response
    {
        $equipment = Equipment::with(['activeAssignment.employee.position', 'pendingAssignment.employee'])
            ->orderBy('name')
            ->get()
            ->map(fn(Equipment $e) => [
                'id'            => $e->id,
                'name'          => $e->name,
                'serial_number' => $e->serial_number,
                'brand'         => $e->brand,
                'model'         => $e->model,
                'condition'     => $e->condition,
                'condition_label' => $e->condition_label,
                'category'      => $e->category,
                'description'   => $e->description,
                'notes'         => $e->notes,
                'purchased_at'  => $e->purchased_at?->toDateString(),
                'status'        => $e->status,
                'active_assignment' => $e->activeAssignment ? [
                    'id'           => $e->activeAssignment->id,
                    'employee_id'  => $e->activeAssignment->employee_id,
                    'employee_name'=> $e->activeAssignment->employee->full_name,
                    'position'     => $e->activeAssignment->employee->position?->name,
                    'accepted_at'  => $e->activeAssignment->accepted_at?->format('Y-m-d'),
                ] : null,
                'pending_assignment' => $e->pendingAssignment ? [
                    'id'           => $e->pendingAssignment->id,
                    'employee_id'  => $e->pendingAssignment->employee_id,
                    'employee_name'=> $e->pendingAssignment->employee->full_name,
                ] : null,
            ]);

        $assignments = EquipmentAssignment::with(['equipment', 'employee.position', 'employee.branch', 'assigner'])
            ->latest()
            ->take(100)
            ->get()
            ->map(fn(EquipmentAssignment $a) => [
                'id'              => $a->id,
                'equipment_id'    => $a->equipment_id,
                'equipment_name'  => $a->equipment->name,
                'equipment_serial'=> $a->equipment->serial_number,
                'employee_id'     => $a->employee_id,
                'employee_name'   => $a->employee->full_name,
                'employee_position' => $a->employee->position?->name,
                'employee_branch' => $a->employee->branch?->name,
                'status'          => $a->status,
                'rejection_reason'=> $a->rejection_reason,
                'notes'           => $a->notes,
                'accepted_at'     => $a->accepted_at?->format('Y-m-d H:i'),
                'returned_at'     => $a->returned_at?->format('Y-m-d H:i'),
                'assigned_by'     => $a->assigner?->name,
                'created_at'      => $a->created_at->format('Y-m-d'),
            ]);

        $employees = Employee::where('status', 'active')
            ->with(['position', 'branch'])
            ->orderBy('first_name')
            ->get()
            ->map(fn(Employee $e) => [
                'id'       => $e->id,
                'name'     => $e->full_name,
                'position' => $e->position?->name,
                'branch'   => $e->branch?->name,
            ]);

        $siteName = Setting::where('key', 'site_name')->value('value') ?? config('app.name');

        return Inertia::render('hr/equipment/index', [
            'equipment'   => $equipment,
            'assignments' => $assignments,
            'employees'   => $employees,
            'site_name'   => $siteName,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:100',
            'brand'         => 'nullable|string|max:100',
            'model'         => 'nullable|string|max:100',
            'condition'     => 'required|in:new,good,fair,poor,damaged',
            'category'      => 'nullable|string|max:100',
            'description'   => 'nullable|string|max:2000',
            'notes'         => 'nullable|string|max:2000',
            'purchased_at'  => 'nullable|date',
        ]);

        Equipment::create($request->only([
            'name', 'serial_number', 'brand', 'model',
            'condition', 'category', 'description', 'notes', 'purchased_at',
        ]));

        return back()->with('success', 'Тоног төхөөрөмж нэмэгдлээ.');
    }

    public function update(Request $request, Equipment $equipment): RedirectResponse
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:100',
            'brand'         => 'nullable|string|max:100',
            'model'         => 'nullable|string|max:100',
            'condition'     => 'required|in:new,good,fair,poor,damaged',
            'category'      => 'nullable|string|max:100',
            'description'   => 'nullable|string|max:2000',
            'notes'         => 'nullable|string|max:2000',
            'purchased_at'  => 'nullable|date',
        ]);

        $equipment->update($request->only([
            'name', 'serial_number', 'brand', 'model',
            'condition', 'category', 'description', 'notes', 'purchased_at',
        ]));

        return back()->with('success', 'Тоног төхөөрөмж шинэчлэгдлээ.');
    }

    public function destroy(Equipment $equipment): RedirectResponse
    {
        if ($equipment->assignments()->whereIn('status', ['pending', 'accepted'])->exists()) {
            return back()->with('error', 'Энэ тоног төхөөрөмжид идэвхтэй хариуцагч байгаа тул устгах боломжгүй.');
        }

        $equipment->delete();
        return back()->with('success', 'Тоног төхөөрөмж устгагдлаа.');
    }

    public function assign(Request $request, Equipment $equipment): RedirectResponse
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'notes'       => 'nullable|string|max:1000',
        ]);

        if ($equipment->status !== 'available') {
            return back()->with('error', 'Тоног төхөөрөмж одоогоор боломжгүй байна.');
        }

        $assignment = EquipmentAssignment::create([
            'equipment_id' => $equipment->id,
            'employee_id'  => $request->employee_id,
            'assigned_by'  => Auth::id(),
            'status'       => 'pending',
            'notes'        => $request->notes,
        ]);

        $equipment->update(['status' => 'assigned']);

        $employee = Employee::with(['user', 'position', 'branch'])->find($request->employee_id);
        if ($employee->user) {
            $assignment->load(['equipment', 'employee.position', 'employee.branch']);
            try {
                $employee->user->notify(new EquipmentAssigned($assignment));
            } catch (\Throwable) {
                // DB notification saved; mail channel may have failed
            }
        }

        return back()->with('success', 'Хүлээлгэн өгөх хүсэлт илгээгдлээ.');
    }

    public function markReturned(EquipmentAssignment $equipmentAssignment): RedirectResponse
    {
        if (!$equipmentAssignment->isAccepted()) {
            return back()->with('error', 'Зөвхөн баталгаажсан хариуцлагыг буцааж авах боломжтой.');
        }

        $equipmentAssignment->update([
            'status'      => 'returned',
            'returned_at' => now(),
        ]);

        $equipmentAssignment->equipment->update(['status' => 'available']);

        $equipmentAssignment->load(['equipment', 'employee.user']);
        if ($equipmentAssignment->employee->user) {
            try {
                $equipmentAssignment->employee->user->notify(new EquipmentReturnedByAdmin($equipmentAssignment));
            } catch (\Throwable) {
                // DB notification saved; mail channel may have failed
            }
        }

        return back()->with('success', 'Тоног төхөөрөмж буцааж авагдлаа.');
    }

    public function assignments(): \Inertia\Response
    {
        return $this->index();
    }
}
