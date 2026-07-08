<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceLog;
use App\Models\HR\EmployeeWarning;
use App\Models\HR\HrDocument;
use App\Models\HR\LeaveRequest;
use App\Models\HR\OrthoSchedule;
use App\Models\HR\SupportSchedule;
use App\Models\HR\VacationRequest;
use App\Models\HR\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return redirect()->route('portal.select');
        }

        $employee->load(['position', 'branch']);

        $today = Carbon::today();
        $weekStart = $today->copy()->startOfWeek(Carbon::MONDAY);

        $weekEnd = $weekStart->copy()->addDays(6);

        // Хуваарь 3 эх сурвалжид байж болно (эмч сувилагч / туслах / гажиг засал).
        // Гурвыг нь огноогоор нэгтгэнэ (давуу эрх: work > support > ortho).
        $byDate = [];

        foreach (OrthoSchedule::with('assignedDoctor')->where('employee_id', $employee->id)
            ->whereBetween('date', [$weekStart, $weekEnd])->get() as $o) {
            $working = in_array($o->state, ['work', 'warehouse'], true);
            $byDate[$o->date->format('Y-m-d')] = [
                'shift_type' => $working ? 'full' : 'off',
                'shift_label' => OrthoSchedule::STATES[$o->state] ?? $o->state,
                'start_time' => null, 'end_time' => null, 'room' => null,
                'assigned_doctor_name' => $o->assignedDoctor?->full_name, 'notes' => $o->note,
            ];
        }
        foreach (SupportSchedule::where('employee_id', $employee->id)
            ->whereBetween('date', [$weekStart, $weekEnd])->get() as $sp) {
            $byDate[$sp->date->format('Y-m-d')] = [
                'shift_type' => $sp->shift_type,
                'shift_label' => SupportSchedule::SHIFTS[$sp->shift_type] ?? $sp->shift_type,
                'start_time' => $sp->start_time ? substr($sp->start_time, 0, 5) : null,
                'end_time' => $sp->end_time ? substr($sp->end_time, 0, 5) : null,
                'room' => null, 'assigned_doctor_name' => null, 'notes' => $sp->note,
            ];
        }
        foreach (WorkSchedule::with('assignedDoctor')->where('employee_id', $employee->id)
            ->whereBetween('date', [$weekStart, $weekEnd])->get() as $s) {
            $byDate[$s->date->format('Y-m-d')] = [
                'shift_type' => $s->shift_type,
                'shift_label' => $s->shift_label,
                'start_time' => $s->start_time ? substr($s->start_time, 0, 5) : null,
                'end_time' => $s->end_time ? substr($s->end_time, 0, 5) : null,
                'room' => $s->room, 'assigned_doctor_name' => $s->assignedDoctor?->full_name, 'notes' => $s->notes,
            ];
        }

        $dayLabels = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];

        $weekDays = collect(range(0, 6))->map(function ($i) use ($weekStart, $byDate, $dayLabels) {
            $day = $weekStart->copy()->addDays($i);
            $dateStr = $day->format('Y-m-d');
            $sched = $byDate[$dateStr] ?? null;

            return [
                'date' => $dateStr,
                'day_num' => $day->day,
                'day_label' => $dayLabels[$i],
                'is_today' => $day->isToday(),
                'shift_type' => $sched['shift_type'] ?? null,
                'start_time' => $sched['start_time'] ?? null,
                'end_time' => $sched['end_time'] ?? null,
            ];
        });

        $todaySched = $byDate[$today->format('Y-m-d')] ?? null;

        $pendingLeave = LeaveRequest::where('employee_id', $employee->id)->where('status', 'pending')->count();
        $pendingVacation = VacationRequest::where('employee_id', $employee->id)->where('status', 'pending')->count();
        $warningCount = EmployeeWarning::where('employee_id', $employee->id)->whereNull('acknowledged_at')->count();
        $docCount = HrDocument::whereNull('expires_at')->orWhereDate('expires_at', '>=', now())->count();

        $attendance = AttendanceLog::where('employee_id', $employee->id)
            ->where('date', $today->toDateString())
            ->first();

        $fullDayLabels = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
        $todayIdx = ($today->dayOfWeek + 6) % 7;

        return Inertia::render('my/home', [
            'employee' => [
                'number' => $employee->employee_number,
                'name' => $employee->first_name,
                'full_name' => $employee->full_name,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
                'position' => $employee->position?->name,
                'branch' => $employee->branch?->name,
                'photo_url' => $employee->photo_url,
            ],
            'can_manage_schedule' => $employee->canManageAnySchedule(),
            'today_schedule' => $todaySched ? [
                'shift_type' => $todaySched['shift_type'],
                'shift_label' => $todaySched['shift_label'],
                'start_time' => $todaySched['start_time'],
                'end_time' => $todaySched['end_time'],
                'room' => $todaySched['room'],
                'assigned_doctor_name' => $todaySched['assigned_doctor_name'],
                'notes' => $todaySched['notes'],
            ] : null,
            'week_days' => $weekDays,
            'stats' => [
                'pending_leave' => $pendingLeave,
                'pending_vacation' => $pendingVacation,
                'documents' => $docCount,
                'warnings' => $warningCount,
                'vacation_days' => $employee->vacation_days,
            ],
            'today' => [
                'date' => $today->format('Y.m.d'),
                'day_label' => $fullDayLabels[$todayIdx],
            ],
            'attendance' => $attendance ? [
                'checked_in_at' => $attendance->checked_in_at?->format('H:i'),
                'checked_out_at' => $attendance->checked_out_at?->format('H:i'),
                'worked_minutes' => $attendance->worked_minutes,
            ] : null,
        ]);
    }
}
