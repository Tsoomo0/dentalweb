<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeWarning;
use App\Notifications\WarningIssued;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class WarningController extends Controller
{
    public function index(): Response
    {
        $warnings = EmployeeWarning::with(['employee.position', 'employee.branch', 'issuedBy'])
            ->latest()
            ->get()
            ->map(fn($w) => $this->format($w));

        $employees = Employee::with('position')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn($e) => [
                'id'       => $e->id,
                'name'     => $e->full_name,
                'position' => $e->position?->name,
            ]);

        return Inertia::render('hr/warnings/index', [
            'warnings'  => $warnings,
            'employees' => $employees,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'employee_id'   => 'required|exists:employees,id',
            'type'          => 'required|in:warning,violation',
            'severity'      => 'required|in:low,medium,high',
            'title'         => 'required|string|max:200',
            'description'   => 'required|string|max:3000',
            'incident_date' => 'required|date',
            'action'        => 'required|in:verbal_warning,written_warning,salary_deduction,suspension,termination,other',
            'action_detail' => 'nullable|string|max:1000',
        ]);

        $warning = EmployeeWarning::create([
            'employee_id'   => $request->employee_id,
            'issued_by'     => Auth::id(),
            'type'          => $request->type,
            'severity'      => $request->severity,
            'title'         => $request->title,
            'description'   => $request->description,
            'incident_date' => $request->incident_date,
            'action'        => $request->action,
            'action_detail' => $request->action_detail,
        ]);

        $warning->load(['employee.user']);

        if ($warning->employee->user) {
            try {
                $warning->employee->user->notify(new WarningIssued($warning));
            } catch (\Throwable) {}
        }

        return back()->with('success', "{$warning->type_label} амжилттай илгээгдлээ.");
    }

    public function destroy(EmployeeWarning $warning): RedirectResponse
    {
        $warning->delete();
        return back()->with('success', 'Устгагдлаа.');
    }

    private function format(EmployeeWarning $w): array
    {
        return [
            'id'               => $w->id,
            'type'             => $w->type,
            'type_label'       => $w->type_label,
            'severity'         => $w->severity,
            'severity_label'   => $w->severity_label,
            'title'            => $w->title,
            'description'      => $w->description,
            'incident_date'    => $w->incident_date->format('Y-m-d'),
            'action'           => $w->action,
            'action_label'     => $w->action_label,
            'action_detail'    => $w->action_detail,
            'status'           => $w->status,
            'status_label'     => $w->status_label,
            'employee_response'=> $w->employee_response,
            'acknowledged_at'  => $w->acknowledged_at?->format('Y-m-d H:i'),
            'employee_name'    => $w->employee->full_name,
            'employee_position'=> $w->employee->position?->name,
            'employee_branch'  => $w->employee->branch?->name,
            'issued_by'        => $w->issuedBy?->name,
            'created_at'       => $w->created_at->format('Y-m-d'),
        ];
    }
}
