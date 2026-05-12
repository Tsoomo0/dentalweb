<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Http\Controllers\My\ProfileController;
use App\Models\HR\Employee;
use App\Models\HR\EquipmentAssignment;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\EquipmentAssignmentResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EquipmentController extends Controller
{
    private function getEmployee(): ?Employee
    {
        $emp = ProfileController::resolveEmployee();
        if ($emp) {
            $emp->load(['user', 'position', 'branch']);
        }
        return $emp;
    }

    private function notifyAdmins(EquipmentAssignment $assignment): void
    {
        User::whereHas('role', fn($q) => $q->where('name', 'admin'))
            ->get()
            ->each(function ($u) use ($assignment) {
                try {
                    $u->notify(new EquipmentAssignmentResponse($assignment));
                } catch (\Throwable) {
                    // DB notification saved; mail channel may have failed
                }
            });
    }

    public function index(): Response
    {
        $employee = $this->getEmployee();

        if (!$employee) {
            return Inertia::render('my/equipment', [
                'employee'  => null,
                'pending'   => [],
                'history'   => [],
                'site_name' => config('app.name'),
            ]);
        }

        $assignments = EquipmentAssignment::with(['equipment', 'employee.position', 'employee.branch', 'assigner'])
            ->where('employee_id', $employee->id)
            ->latest()
            ->get()
            ->map(fn(EquipmentAssignment $a) => [
                'id'               => $a->id,
                'status'           => $a->status,
                'rejection_reason' => $a->rejection_reason,
                'notes'            => $a->notes,
                'accepted_at'      => $a->accepted_at?->format('Y-m-d H:i'),
                'returned_at'      => $a->returned_at?->format('Y-m-d H:i'),
                'assigned_by'      => $a->assigner?->name,
                'assigned_at'      => $a->created_at->format('Y-m-d'),
                'equipment' => [
                    'id'              => $a->equipment->id,
                    'name'            => $a->equipment->name,
                    'serial_number'   => $a->equipment->serial_number,
                    'brand'           => $a->equipment->brand,
                    'model'           => $a->equipment->model,
                    'condition'       => $a->equipment->condition,
                    'condition_label' => $a->equipment->condition_label,
                    'category'        => $a->equipment->category,
                ],
                'employee' => [
                    'full_name' => $employee->full_name,
                    'position'  => $employee->position?->name,
                    'branch'    => $employee->branch?->name,
                ],
            ]);

        $pending = $assignments->filter(fn($a) => $a['status'] === 'pending')->values();
        $history = $assignments->filter(fn($a) => $a['status'] !== 'pending')->values();

        $siteName = Setting::where('key', 'site_name')->value('value') ?? config('app.name');

        return Inertia::render('my/equipment', [
            'employee'  => [
                'full_name'  => $employee->full_name,
                'position'   => $employee->position?->name,
                'photo_url'  => $employee->photo_url,
                'initials'   => mb_substr($employee->last_name ?? '', 0, 1) . mb_substr($employee->first_name ?? '', 0, 1),
            ],
            'pending'   => $pending,
            'history'   => $history,
            'site_name' => $siteName,
        ]);
    }

    public function accept(EquipmentAssignment $equipmentAssignment): RedirectResponse
    {
        $employee = $this->getEmployee();
        if (!$employee || $equipmentAssignment->employee_id !== $employee->id) {
            abort(403);
        }
        if (!$equipmentAssignment->isPending()) {
            return back()->with('error', 'Хүсэлт аль хэдийн шийдэгдсэн байна.');
        }

        $equipmentAssignment->update([
            'status'      => 'accepted',
            'accepted_at' => now(),
        ]);

        $equipmentAssignment->load(['equipment', 'employee.position', 'employee.branch']);

        $this->notifyAdmins($equipmentAssignment);

        return back()->with('success', 'Тоног төхөөрөмж хүлээн авлаа.');
    }

    public function reject(Request $request, EquipmentAssignment $equipmentAssignment): RedirectResponse
    {
        $employee = $this->getEmployee();
        if (!$employee || $equipmentAssignment->employee_id !== $employee->id) {
            abort(403);
        }
        if (!$equipmentAssignment->isPending()) {
            return back()->with('error', 'Хүсэлт аль хэдийн шийдэгдсэн байна.');
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $equipmentAssignment->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        $equipmentAssignment->equipment->update(['status' => 'available']);
        $equipmentAssignment->load(['equipment', 'employee.position', 'employee.branch']);

        $this->notifyAdmins($equipmentAssignment);

        return back()->with('success', 'Татгалзлаа.');
    }
}
