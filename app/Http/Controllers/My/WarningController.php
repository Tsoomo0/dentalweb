<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\EmployeeWarning;
use App\Models\User;
use App\Notifications\WarningAcknowledged;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WarningController extends Controller
{
    public function index(): Response
    {
        $employee = ProfileController::resolveEmployee();

        if (!$employee) {
            return Inertia::render('my/warnings', ['warnings' => [], 'employee' => null]);
        }

        $employee->load(['position', 'branch']);

        $warnings = EmployeeWarning::with('issuedBy')
            ->where('employee_id', $employee->id)
            ->latest()
            ->get()
            ->map(fn($w) => [
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
                'issued_by'        => $w->issuedBy?->name,
                'created_at'       => $w->created_at->format('Y-m-d'),
            ]);

        return Inertia::render('my/warnings', [
            'warnings'  => $warnings,
            'employee'  => [
                'full_name' => $employee->full_name,
                'position'  => $employee->position?->name,
                'photo_url' => $employee->photo_url,
                'initials'  => mb_substr($employee->last_name ?? '', 0, 1) . mb_substr($employee->first_name ?? '', 0, 1),
            ],
        ]);
    }

    public function acknowledge(Request $request, EmployeeWarning $warning): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (!$employee || $warning->employee_id !== $employee->id) abort(403);
        if ($warning->status === 'acknowledged') return back();

        $request->validate([
            'employee_response' => 'nullable|string|max:2000',
        ]);

        $warning->update([
            'status'            => 'acknowledged',
            'employee_response' => $request->employee_response,
            'acknowledged_at'   => now(),
        ]);

        $warning->load(['employee', 'issuedBy']);

        User::whereHas('role', fn($q) => $q->where('name', 'admin'))
            ->get()
            ->each(function ($u) use ($warning) {
                try {
                    $u->notify(new WarningAcknowledged($warning));
                } catch (\Throwable) {}
            });

        return back()->with('success', 'Хүлээн зөвшөөрлөө.');
    }
}
