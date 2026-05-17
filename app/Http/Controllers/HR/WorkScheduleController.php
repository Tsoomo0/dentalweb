<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class WorkScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $year = $request->integer('year', now()->year);
        $month = $request->integer('month', now()->month);

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $schedules = WorkSchedule::with(['employee.position', 'assignedDoctor'])
            ->whereBetween('date', [$start, $end])
            ->get()
            ->map(fn ($s) => $this->format($s));

        $branches = Branch::where('is_active', true)
            ->orderBy('order')->orderBy('name')
            ->get()
            ->map(fn ($b) => ['id' => $b->id, 'name' => $b->name]);

        $employees = Employee::with(['position', 'branch'])
            ->where('status', 'active')
            ->orderBy('last_name')->orderBy('first_name')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'position' => $e->position?->name,
                'branch_id' => $e->branch_id,
                'branch' => $e->branch?->name,
            ]);

        // Зөвхөн эмч нарыг сувилагч/туслах эмчид хариуцуулахад ашиглана
        $doctors = Employee::with('position')
            ->where('status', 'active')
            ->whereHas('position', fn ($q) => $q->where('name', 'like', '%эмч%'))
            ->orderBy('last_name')->orderBy('first_name')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'position' => $e->position?->name,
            ]);

        return Inertia::render('hr/work-schedules/index', [
            'schedules' => $schedules,
            'employees' => $employees,
            'doctors' => $doctors,
            'branches' => $branches,
            'year' => $year,
            'month' => $month,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'shift_type' => 'required|in:morning,afternoon,full,off',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'room' => 'nullable|string|max:50',
            'assigned_doctor_id' => 'nullable|exists:employees,id',
            'notes' => 'nullable|string|max:500',
        ]);

        WorkSchedule::updateOrCreate(
            ['employee_id' => $request->employee_id, 'date' => $request->date],
            [
                'shift_type' => $request->shift_type,
                'start_time' => $request->shift_type === 'off' ? null : $request->start_time,
                'end_time' => $request->shift_type === 'off' ? null : $request->end_time,
                'room' => $request->room,
                'assigned_doctor_id' => $request->assigned_doctor_id,
                'notes' => $request->notes,
                'created_by' => Auth::id(),
                'deleted_at' => null,
            ]
        );

        return back()->with('success', 'Хуваарь хадгалагдлаа.');
    }

    public function update(Request $request, WorkSchedule $workSchedule): RedirectResponse
    {
        $request->validate([
            'shift_type' => 'required|in:morning,afternoon,full,off',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'room' => 'nullable|string|max:50',
            'assigned_doctor_id' => 'nullable|exists:employees,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $workSchedule->update([
            'shift_type' => $request->shift_type,
            'start_time' => $request->shift_type === 'off' ? null : $request->start_time,
            'end_time' => $request->shift_type === 'off' ? null : $request->end_time,
            'room' => $request->room,
            'assigned_doctor_id' => $request->assigned_doctor_id,
            'notes' => $request->notes,
        ]);

        return back()->with('success', 'Хуваарь шинэчлэгдлээ.');
    }

    public function destroy(WorkSchedule $workSchedule): RedirectResponse
    {
        $workSchedule->delete();

        return back()->with('success', 'Устгагдлаа.');
    }

    private function format(WorkSchedule $s): array
    {
        return [
            'id' => $s->id,
            'employee_id' => $s->employee_id,
            'employee_name' => $s->employee->full_name,
            'employee_position' => $s->employee->position?->name,
            'date' => $s->date->format('Y-m-d'),
            'shift_type' => $s->shift_type,
            'shift_label' => $s->shift_label,
            'start_time' => $s->start_time ? substr($s->start_time, 0, 5) : null,
            'end_time' => $s->end_time ? substr($s->end_time, 0, 5) : null,
            'room' => $s->room,
            'assigned_doctor_id' => $s->assigned_doctor_id,
            'assigned_doctor_name' => $s->assignedDoctor?->full_name,
            'notes' => $s->notes,
        ];
    }
}
