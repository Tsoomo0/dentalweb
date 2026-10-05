<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceLog;
use App\Models\HR\EmployeeDocument;
use App\Models\HR\EmployeeWarning;
use App\Models\HR\HrDocument;
use App\Models\HR\LeaveRequest;
use App\Models\HR\VacationRequest;
use App\Services\Schedule\RosterLookup;
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

        // Зөвхөн НИЙТЛЭГДСЭН хуваарь. Нэг өдөр хэд хэдэн ээлжтэй бол нэгтгэж харуулна.
        $byDate = [];
        foreach (RosterLookup::plans([$employee->id], $weekStart->toDateString(), $weekEnd->toDateString())[$employee->id] ?? [] as $date => $plan) {
            $first = collect($plan['shifts'])->first(fn ($s) => $s->isWork()) ?? $plan['shifts'][0];
            $byDate[$date] = [
                'shift_type' => self::shiftType($plan),
                'shift_label' => $plan['label'],
                'start_time' => $plan['start'],
                'end_time' => $plan['end'],
                'room' => $first->room,
                'assigned_doctor_name' => $first->assignedDoctor?->full_name,
                'notes' => $first->note,
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
        $pendingContracts = EmployeeDocument::where('employee_id', $employee->id)
            ->where('status', 'pending_employee')
            ->count();

        $attendance = AttendanceLog::where('employee_id', $employee->id)
            ->whereDate('date', $today->toDateString())
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
                'pending_contracts' => $pendingContracts,
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
            // Салбарт байршлаар бүртгэх хаалттай бол "Ажил эхлэх / Тарах" товч нуугдаж,
            // зөвхөн хурууны хээгээр бүртгэгдсэн цаг харагдана.
            'gps_attendance_enabled' => $employee->branch?->attendance_gps_enabled ?? true,
        ]);
    }

    /**
     * Нүүр хуудасны өнгө/тайлбарт зориулсан ангилал — ээлжийн загвар чөлөөтэй
     * тодорхойлогддог тул эхлэх/дуусах цагаас нь тааж ангилна.
     */
    private static function shiftType(array $plan): string
    {
        if (! $plan['work']) {
            return 'off';
        }
        if ($plan['start_min'] === null) {
            return 'full';
        }

        return match (true) {
            $plan['start_min'] >= 12 * 60 => 'afternoon',
            $plan['end_min'] <= 17 * 60 => 'morning',
            default => 'full',
        };
    }
}
