<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $employee = ProfileController::resolveEmployee();

        if (!$employee) {
            return Inertia::render('my/work-schedule', [
                'employee'  => null,
                'schedules' => [],
                'year'      => now()->year,
                'month'     => now()->month,
            ]);
        }

        $year  = $request->integer('year',  now()->year);
        $month = $request->integer('month', now()->month);

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        $schedules = WorkSchedule::with('assignedDoctor')
            ->where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])
            ->get()
            ->map(fn($s) => [
                'id'                   => $s->id,
                'date'                 => $s->date->format('Y-m-d'),
                'shift_type'           => $s->shift_type,
                'shift_label'          => $s->shift_label,
                'start_time'           => $s->start_time ? substr($s->start_time, 0, 5) : null,
                'end_time'             => $s->end_time   ? substr($s->end_time,   0, 5) : null,
                'room'                 => $s->room,
                'assigned_doctor_name' => $s->assignedDoctor?->full_name,
                'notes'                => $s->notes,
            ]);

        return Inertia::render('my/work-schedule', [
            'employee'  => [
                'full_name'  => $employee->full_name,
                'position'   => $employee->position?->name,
                'photo_url'  => $employee->photo_url,
                'initials'   => mb_substr($employee->last_name ?? '', 0, 1) . mb_substr($employee->first_name ?? '', 0, 1),
            ],
            'schedules' => $schedules,
            'year'      => $year,
            'month'     => $month,
        ]);
    }
}
