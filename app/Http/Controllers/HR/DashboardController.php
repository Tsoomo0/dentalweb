<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceLog;
use App\Models\HR\BookRental;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeWarning;
use App\Models\HR\EquipmentAssignment;
use App\Models\HR\FeedbackRequest;
use App\Models\HR\LeaveRequest;
use App\Models\HR\PayrollRun;
use App\Models\HR\VacationRequest;
use App\Models\HR\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();

        /* ── Stat cards ─────────────────────────────────────────────────────── */
        $totalEmployees = Employee::where('status', 'active')->count();
        $pendingLeaveCount = LeaveRequest::where('status', 'pending')->count();
        $pendingVacCount = VacationRequest::where('status', 'pending')->count();
        $pendingFeedback = FeedbackRequest::where('status', 'pending')->count();
        $pendingBookRental = BookRental::where('status', 'pending')->count();

        /* ── Pending approvals ──────────────────────────────────────────────── */
        $pendingLeave = LeaveRequest::with('employee.position')
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->take(6)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'employee' => $r->employee?->full_name,
                'position' => $r->employee?->position?->name,
                'leave_type' => $r->leave_type,
                'start_date' => $r->start_date,
                'end_date' => $r->end_date,
                'created_at' => $r->created_at->format('Y-m-d'),
            ]);

        $pendingVacation = VacationRequest::with('employee.position')
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->take(6)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'employee' => $r->employee?->full_name,
                'position' => $r->employee?->position?->name,
                'start_date' => $r->start_date,
                'end_date' => $r->end_date,
                'created_at' => $r->created_at->format('Y-m-d'),
            ]);

        $pendingRentals = BookRental::with(['employee', 'book'])
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->take(6)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'employee' => $r->employee?->full_name,
                'book' => $r->book?->title,
                'created_at' => $r->created_at->format('Y-m-d'),
            ]);

        /* ── Today's attendance ────────────────────────────────────────────── */
        $todayLogs = AttendanceLog::whereDate('date', $today)->get();
        $scheduledToday = WorkSchedule::whereDate('date', $today)->whereNotIn('shift_type', ['off'])->count();
        $checkedInToday = $todayLogs->where('checked_in_at', '!=', null)->count();
        $checkedOutToday = $todayLogs->where('checked_out_at', '!=', null)->count();
        $notYetCheckedIn = max(0, $scheduledToday - $checkedInToday);

        $todayLateCount = 0;
        foreach ($todayLogs as $log) {
            if (! $log->checked_in_at) {
                continue;
            }
            $sched = WorkSchedule::where('employee_id', $log->employee_id)
                ->whereDate('date', $today)
                ->whereNotIn('shift_type', ['off'])
                ->first();
            if ($sched && $sched->start_time) {
                $start = Carbon::createFromFormat('H:i:s', $sched->start_time)->setDateFrom(now());
                if ($log->checked_in_at->gt($start)) {
                    $todayLateCount++;
                }
            }
        }

        /* ── Today's schedule ───────────────────────────────────────────────── */
        $todayShifts = WorkSchedule::whereDate('date', $today)
            ->select('shift_type', DB::raw('count(*) as count'))
            ->groupBy('shift_type')
            ->pluck('count', 'shift_type');

        /* ── Alerts: probation ending within 30 days ───────────────────────── */
        $probationAlerts = Employee::with(['position', 'branch'])
            ->where('status', 'active')
            ->whereNotNull('probation_end_date')
            ->whereBetween('probation_end_date', [$today, now()->addDays(30)->toDateString()])
            ->orderBy('probation_end_date')
            ->take(8)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'position' => $e->position?->name,
                'branch' => $e->branch?->name,
                'probation_end_date' => $e->probation_end_date,
            ]);

        /* ── Alerts: unacknowledged warnings ───────────────────────────────── */
        $activeWarnings = EmployeeWarning::with('employee')
            ->where('status', 'sent')
            ->orderByDesc('incident_date')
            ->take(6)
            ->get()
            ->map(fn ($w) => [
                'id' => $w->id,
                'employee' => $w->employee?->full_name,
                'type' => $w->type,
                'severity' => $w->severity,
                'title' => $w->title,
                'incident_date' => $w->incident_date,
            ]);

        /* ── Employee breakdown ─────────────────────────────────────────────── */
        $byStatus = Employee::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        /* ── Equipment assigned (not returned) ──────────────────────────────── */
        $equipmentOut = EquipmentAssignment::where('status', 'accepted')
            ->whereNull('returned_at')
            ->count();

        /* ── Latest payroll run ─────────────────────────────────────────────── */
        $latestPayroll = PayrollRun::orderByDesc('id')->first();
        $latestPayrollData = $latestPayroll ? [
            'id' => $latestPayroll->id,
            'label' => $latestPayroll->label,
            'status' => $latestPayroll->status,
            'year' => $latestPayroll->year,
            'month' => $latestPayroll->month,
        ] : null;

        /* ── Feedback recent ─────────────────────────────────────────────────── */
        $recentFeedback = FeedbackRequest::with('employee')
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'employee' => $f->employee?->full_name,
                'type' => $f->type,
                'subject' => $f->subject,
                'created_at' => $f->created_at->format('Y-m-d'),
            ]);

        /* ══════════════ CHART DATA ══════════════════════════════════════════ */

        /* Chart 1: Employees by branch (bar) */
        $byBranch = Employee::with('branch')
            ->where('status', 'active')
            ->select('branch_id', DB::raw('count(*) as count'))
            ->groupBy('branch_id')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($e) => [
                'name' => $e->branch?->name ?? 'Тодорхойгүй',
                'count' => (int) $e->count,
            ]);

        /* Chart 2: Employees by position (top 8, bar) */
        $byPosition = Employee::with('position')
            ->where('status', 'active')
            ->select('position_id', DB::raw('count(*) as count'))
            ->groupBy('position_id')
            ->orderByDesc('count')
            ->take(8)
            ->get()
            ->map(fn ($e) => [
                'name' => $e->position?->name ?? 'Тодорхойгүй',
                'count' => (int) $e->count,
            ]);

        /* Chart 3: Leave + vacation requests last 6 months (area) */
        $months = collect();
        for ($i = 5; $i >= 0; $i--) {
            $dt = now()->subMonths($i);
            $months->push([
                'key' => $dt->format('Y-m'),
                'label' => $dt->format('m').' сар',
            ]);
        }

        $leaveByMonth = LeaveRequest::select(
            DB::raw("DATE_FORMAT(created_at, '%Y-%m') as ym"),
            DB::raw('count(*) as count')
        )
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('ym')
            ->pluck('count', 'ym');

        $vacByMonth = VacationRequest::select(
            DB::raw("DATE_FORMAT(created_at, '%Y-%m') as ym"),
            DB::raw('count(*) as count')
        )
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('ym')
            ->pluck('count', 'ym');

        $requestTrend = $months->map(fn ($m) => [
            'label' => $m['label'],
            'leave' => (int) ($leaveByMonth[$m['key']] ?? 0),
            'vacation' => (int) ($vacByMonth[$m['key']] ?? 0),
        ])->values();

        /* Chart 4: Payroll net salary last 6 finalized runs (line) */
        $payrollTrend = PayrollRun::where('status', 'final')
            ->orderByDesc('id')
            ->take(6)
            ->with(['entries' => fn ($q) => $q->select('payroll_run_id', DB::raw('sum(net_hand) as total'))->groupBy('payroll_run_id')])
            ->get()
            ->sortBy('id')
            ->map(fn ($run) => [
                'label' => $run->label,
                'total' => (int) ($run->entries->first()?->total ?? 0),
            ])
            ->values();

        /* Chart 5: Leave request status pie */
        $leaveStatusPie = LeaveRequest::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn ($r) => ['name' => $r->status, 'value' => (int) $r->count]);

        return Inertia::render('hr/dashboard', [
            'stats' => [
                'total_employees' => $totalEmployees,
                'pending_leave' => $pendingLeaveCount,
                'pending_vacation' => $pendingVacCount,
                'pending_feedback' => $pendingFeedback,
                'pending_book_rental' => $pendingBookRental,
                'equipment_out' => $equipmentOut,
                'by_status' => $byStatus,
            ],
            'today_attendance' => [
                'scheduled' => $scheduledToday,
                'checked_in' => $checkedInToday,
                'checked_out' => $checkedOutToday,
                'not_checked_in' => $notYetCheckedIn,
                'late' => $todayLateCount,
            ],
            'today_shifts' => $todayShifts,
            'pending_leave' => $pendingLeave,
            'pending_vacation' => $pendingVacation,
            'pending_rentals' => $pendingRentals,
            'probation_alerts' => $probationAlerts,
            'active_warnings' => $activeWarnings,
            'recent_feedback' => $recentFeedback,
            'latest_payroll' => $latestPayrollData,
            'today' => $today,
            // Charts
            'chart_by_branch' => $byBranch,
            'chart_by_position' => $byPosition,
            'chart_request_trend' => $requestTrend,
            'chart_payroll_trend' => $payrollTrend,
            'chart_leave_status' => $leaveStatusPie,
        ]);
    }
}
