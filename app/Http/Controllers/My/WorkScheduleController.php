<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\OrthoSchedule;
use App\Models\HR\SupportSchedule;
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

        if (! $employee) {
            return Inertia::render('my/work-schedule', [
                'employee' => null,
                'schedules' => [],
                'year' => now()->year,
                'month' => now()->month,
            ]);
        }

        $year = $request->integer('year', now()->year);
        $month = $request->integer('month', now()->month);

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        // Ажилтны хуваарь 3 эх сурвалжид байж болно: эмч сувилагч (WorkSchedule),
        // туслах ажилтан (SupportSchedule), гажиг засал (OrthoSchedule).
        // Гурвыг нь огноогоор нэгтгэж, тухайн ажилтанд бүгдийг нь харуулна.
        $byDate = [];

        // Гажиг засал (хамгийн бага давуу эрх)
        foreach (OrthoSchedule::with('assignedDoctor')
            ->where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])->get() as $o) {
            $working = in_array($o->state, ['work', 'warehouse'], true);
            $byDate[$o->date->format('Y-m-d')] = [
                'id' => $o->id,
                'date' => $o->date->format('Y-m-d'),
                'shift_type' => $working ? 'full' : 'off',
                'shift_label' => OrthoSchedule::STATES[$o->state] ?? $o->state,
                'start_time' => null,
                'end_time' => null,
                'room' => null,
                'assigned_doctor_name' => $o->assignedDoctor?->full_name,
                'notes' => $o->note,
            ];
        }

        // Туслах ажилтан
        foreach (SupportSchedule::where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])->get() as $sp) {
            $byDate[$sp->date->format('Y-m-d')] = [
                'id' => $sp->id,
                'date' => $sp->date->format('Y-m-d'),
                'shift_type' => $sp->shift_type,
                'shift_label' => SupportSchedule::SHIFTS[$sp->shift_type] ?? $sp->shift_type,
                'start_time' => $sp->start_time ? substr($sp->start_time, 0, 5) : null,
                'end_time' => $sp->end_time ? substr($sp->end_time, 0, 5) : null,
                'room' => null,
                'assigned_doctor_name' => null,
                'notes' => $sp->note,
            ];
        }

        // Эмч сувилагч (хамгийн өндөр давуу эрх)
        foreach (WorkSchedule::with('assignedDoctor')
            ->where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])->get() as $s) {
            $byDate[$s->date->format('Y-m-d')] = [
                'id' => $s->id,
                'date' => $s->date->format('Y-m-d'),
                'shift_type' => $s->shift_type,
                'shift_label' => $s->shift_label,
                'start_time' => $s->start_time ? substr($s->start_time, 0, 5) : null,
                'end_time' => $s->end_time ? substr($s->end_time, 0, 5) : null,
                'room' => $s->room,
                'assigned_doctor_name' => $s->assignedDoctor?->full_name,
                'notes' => $s->notes,
            ];
        }

        $schedules = array_values($byDate);

        return Inertia::render('my/work-schedule', [
            'employee' => [
                'full_name' => $employee->full_name,
                'position' => $employee->position?->name,
                'photo_url' => $employee->photo_url,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
            ],
            'schedules' => $schedules,
            'year' => $year,
            'month' => $month,
        ]);
    }
}
