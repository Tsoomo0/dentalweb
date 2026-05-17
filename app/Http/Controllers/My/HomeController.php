<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceLog;
use App\Models\HR\EmployeeWarning;
use App\Models\HR\HrDocument;
use App\Models\HR\LeaveRequest;
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

        $weekSchedules = WorkSchedule::where('employee_id', $employee->id)
            ->whereBetween('date', [$weekStart, $weekStart->copy()->addDays(6)])
            ->get()
            ->keyBy(fn ($s) => $s->date->format('Y-m-d'));

        $dayLabels = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];

        $weekDays = collect(range(0, 6))->map(function ($i) use ($weekStart, $weekSchedules, $dayLabels) {
            $day = $weekStart->copy()->addDays($i);
            $dateStr = $day->format('Y-m-d');
            $sched = $weekSchedules->get($dateStr);

            return [
                'date' => $dateStr,
                'day_num' => $day->day,
                'day_label' => $dayLabels[$i],
                'is_today' => $day->isToday(),
                'shift_type' => $sched?->shift_type,
                'start_time' => $sched ? substr($sched->start_time ?? '', 0, 5) : null,
                'end_time' => $sched ? substr($sched->end_time ?? '', 0, 5) : null,
            ];
        });

        $todaySched = $weekSchedules->get($today->format('Y-m-d'));

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
            'today_schedule' => $todaySched ? [
                'shift_type' => $todaySched->shift_type,
                'shift_label' => $todaySched->shift_label,
                'start_time' => substr($todaySched->start_time ?? '', 0, 5),
                'end_time' => substr($todaySched->end_time ?? '', 0, 5),
                'room' => $todaySched->room,
                'assigned_doctor_name' => $todaySched->assignedDoctor?->full_name,
                'notes' => $todaySched->notes,
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
