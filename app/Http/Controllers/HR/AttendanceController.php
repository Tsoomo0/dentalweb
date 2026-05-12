<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\AttendanceLog;
use App\Models\HR\Employee;
use App\Models\HR\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(): Response
    {
        $month = request()->integer('month', now()->month);
        $year  = request()->integer('year',  now()->year);

        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to   = $from->copy()->endOfMonth();

        $employeeId = request()->integer('employee_id', 0) ?: null;
        $branchId   = request()->integer('branch_id', 0) ?: null;

        $query = AttendanceLog::with('employee.position')
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('date', 'desc')
            ->orderBy('employee_id');

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        if ($branchId) {
            $query->whereHas('employee', fn($q) => $q->where('branch_id', $branchId));
        }

        $logs = $query->get();

        $schedules = $this->loadSchedules($logs, $from, $to);

        $mapped = $logs->map(function ($log) use ($schedules) {
            $key      = "{$log->employee_id}_{$log->date->format('Y-m-d')}";
            $schedule = $schedules->get($key);

            [$lateMinutes, $overtimeMinutes] = $this->calcDeltas($log, $schedule);

            return [
                'id'               => $log->id,
                'date'             => $log->date->format('Y-m-d'),
                'employee_id'      => $log->employee_id,
                'employee_name'    => $log->employee->full_name,
                'position'         => $log->employee->position?->name,
                'checked_in_at'    => $log->checked_in_at?->format('H:i'),
                'checked_out_at'   => $log->checked_out_at?->format('H:i'),
                'worked_minutes'   => $log->worked_minutes,
                'scheduled_start'  => $schedule ? substr($schedule->start_time ?? '', 0, 5) : null,
                'scheduled_end'    => $schedule ? substr($schedule->end_time ?? '', 0, 5) : null,
                'late_minutes'     => $lateMinutes,
                'overtime_minutes' => $overtimeMinutes,
            ];
        });

        $employeeQuery = Employee::where('status', 'active')->orderBy('first_name');
        if ($branchId) {
            $employeeQuery->where('branch_id', $branchId);
        }
        $employees = $employeeQuery->get(['id', 'first_name', 'last_name']);

        return Inertia::render('hr/attendance/index', [
            'logs'        => $mapped,
            'employees'   => $employees->map(fn($e) => ['id' => $e->id, 'name' => $e->full_name]),
            'branches'    => Branch::orderBy('order')->get(['id', 'name']),
            'year'        => $year,
            'month'       => $month,
            'employee_id' => $employeeId,
            'branch_id'   => $branchId,
        ]);
    }

    public function exportExcel(): HttpResponse
    {
        $month = request()->integer('month', now()->month);
        $year  = request()->integer('year',  now()->year);
        $employeeId = request()->integer('employee_id', 0) ?: null;
        $branchId   = request()->integer('branch_id', 0) ?: null;

        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to   = $from->copy()->endOfMonth();

        $query = AttendanceLog::with('employee.position')
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('date')
            ->orderBy('employee_id');

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        if ($branchId) {
            $query->whereHas('employee', fn($q) => $q->where('branch_id', $branchId));
        }

        $logs = $query->get();

        $monthLabels = ['1-р сар','2-р сар','3-р сар','4-р сар','5-р сар','6-р сар',
                        '7-р сар','8-р сар','9-р сар','10-р сар','11-р сар','12-р сар'];
        $monthLabel = $monthLabels[$month - 1];

        $employeeName = null;
        if ($employeeId) {
            $emp = Employee::find($employeeId);
            $employeeName = $emp?->full_name;
        }

        $html     = view('hr.attendance-excel', compact('logs', 'year', 'month', 'monthLabel', 'employeeName'))->render();
        $filename = "Ирцийн бүртгэл {$monthLabel} {$year}.xls";
        $encoded  = rawurlencode($filename);

        return response("\xEF\xBB\xBF" . $html, 200, [
            'Content-Type'        => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename*=UTF-8''{$encoded}",
        ]);
    }

    private function loadSchedules(Collection $logs, Carbon $from, Carbon $to): Collection
    {
        $employeeIds = $logs->pluck('employee_id')->unique()->values();

        return WorkSchedule::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->whereNotIn('shift_type', ['off'])
            ->get()
            ->keyBy(fn($s) => "{$s->employee_id}_{$s->date->format('Y-m-d')}");
    }

    private function calcDeltas(AttendanceLog $log, ?WorkSchedule $schedule): array
    {
        $lateMinutes     = null;
        $overtimeMinutes = null;

        if (!$schedule) return [$lateMinutes, $overtimeMinutes];

        if ($log->checked_in_at && $schedule->start_time) {
            $scheduled = Carbon::createFromFormat('H:i:s', $schedule->start_time)
                ->setDate($log->date->year, $log->date->month, $log->date->day);
            $diff = (int) $scheduled->diffInMinutes($log->checked_in_at, false);
            if ($diff > 0) $lateMinutes = $diff;
        }

        if ($log->checked_out_at && $schedule->end_time) {
            $scheduled = Carbon::createFromFormat('H:i:s', $schedule->end_time)
                ->setDate($log->date->year, $log->date->month, $log->date->day);
            $diff = (int) $log->checked_out_at->diffInMinutes($scheduled, false);
            if ($diff > 0) $overtimeMinutes = $diff;
        }

        return [$lateMinutes, $overtimeMinutes];
    }
}
