<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\HR\VacationRequest;
use App\Models\User;
use App\Notifications\VacationRequestSubmitted;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VacationRequestController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return redirect()->route('portal.select');
        }

        $employee->load(['position', 'branch']);

        $requests = VacationRequest::with(['replacement'])
            ->where('employee_id', $employee->id)
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'start_date' => $r->start_date->toDateString(),
                'end_date' => $r->end_date->toDateString(),
                'days' => $r->days,
                'replacement' => $r->replacement?->full_name,
                'location_during_leave' => $r->location_during_leave,
                'emergency_phone' => $r->emergency_phone,
                'had_annual_leave_this_year' => $r->had_annual_leave_this_year,
                'reason' => $r->reason,
                'status' => $r->status,
                'rejection_reason' => $r->rejection_reason,
                'reviewed_at' => $r->reviewed_at?->toDateString(),
                'created_at' => $r->created_at->toDateString(),
            ]);

        // Энэ оны ашигласан хоног
        $usedThisYear = VacationRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereYear('start_date', now()->year)
            ->get()
            ->sum(fn ($r) => $r->days);

        $allowed = $employee->vacation_days + $employee->vacation_extra_days;
        $remaining = max(0, $allowed - $usedThisYear);

        $replacements = Employee::where('id', '!=', $employee->id)
            ->whereNull('deleted_at')
            ->orderBy('last_name')
            ->get(['id', 'last_name', 'first_name'])
            ->map(fn ($e) => ['id' => $e->id, 'name' => $e->full_name]);

        return Inertia::render('my/vacation-requests', [
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->full_name,
                'photo_url' => $employee->photo_url,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
                'position' => $employee->position?->name,
                'branch' => $employee->branch?->name,
            ],
            'balance' => [
                'vacation_days' => $employee->vacation_days,
                'vacation_extra_days' => $employee->vacation_extra_days,
                'allowed' => $allowed,
                'used' => $usedThisYear,
                'remaining' => $remaining,
            ],
            'requests' => $requests,
            'replacements' => $replacements,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            abort(403);
        }

        $data = $request->validate([
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'replacement_employee_id' => 'nullable|exists:employees,id',
            'location_during_leave' => 'required|string|max:255',
            'emergency_phone' => 'required|string|max:20',
            'had_annual_leave_this_year' => 'required|boolean',
            'reason' => 'required|string|max:1000',
        ]);

        $vacation = VacationRequest::create([
            ...$data,
            'employee_id' => $employee->id,
            'status' => 'pending',
        ]);

        $vacation->load('employee.position', 'employee.branch', 'replacement');

        $admins = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();
        foreach ($admins as $admin) {
            $admin->notify(new VacationRequestSubmitted($vacation));
        }

        return back()->with('success', 'Ээлжийн амралтын хүсэлт амжилттай илгээгдлээ.');
    }
}
