<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceLog;
use App\Models\HR\Employee;
use App\Models\HR\ScheduleAvailability;
use App\Models\HR\Shift;
use App\Models\HR\ShiftSwapRequest;
use App\Services\Attendance\AttendanceEvaluator;
use App\Services\Schedule\LeaveCalendar;
use App\Services\Schedule\RosterLookup;
use App\Services\Schedule\ScheduleSettings;
use App\Services\Schedule\ShiftMath;
use App\Services\Schedule\ShiftSwapService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Ажилтны өөрийн хуваарь: нийтлэгдсэн ээлж, чөлөө, ирцийн харьцуулалт,
 * "боломжгүй өдөр" тэмдэглэх, ээлж шилжүүлэх/солилцох хүсэлт.
 */
class WorkScheduleController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return Inertia::render('my/work-schedule', ['employee' => null]);
        }
        $employee->load(['position', 'branch']);

        $focus = $request->date('date') ?? Carbon::create($request->integer('year', now()->year), $request->integer('month', now()->month), 1);
        $start = $focus->copy()->startOfMonth();
        $end = $focus->copy()->endOfMonth()->startOfDay();
        $from = $start->toDateString();
        $to = $end->toDateString();
        $today = today()->toDateString();

        $plans = RosterLookup::plans([$employee->id], $from, $to)[$employee->id] ?? [];
        $leaves = LeaveCalendar::days([$employee->id], $from, $to, includePending: true)[$employee->id] ?? [];
        $logs = AttendanceLog::where('employee_id', $employee->id)->whereBetween('date', [$from, $to])->get()
            ->keyBy(fn ($l) => $l->date->toDateString());
        $availability = ScheduleAvailability::where('employee_id', $employee->id)->whereBetween('date', [$from, $to])->get()
            ->keyBy(fn ($a) => $a->date->toDateString());
        $openSwapShiftIds = ShiftSwapRequest::whereIn('status', [ShiftSwapRequest::PENDING_PEER, ShiftSwapRequest::PENDING_APPROVAL])
            ->where('requester_id', $employee->id)->pluck('shift_id')->flip();
        $evaluator = AttendanceEvaluator::make();

        $days = [];
        foreach (CarbonPeriod::create($from, $to) as $day) {
            $date = $day->toDateString();
            $plan = $plans[$date] ?? null;
            $leave = $leaves[$date] ?? null;
            $log = $logs->get($date);
            $eval = $date <= $today
                ? $evaluator->evaluate($date, $log, $plan, $leave && $leave['status'] === 'approved' ? $leave : null)
                : null;

            $days[] = [
                'date' => $date,
                'shifts' => collect($plan['shifts'] ?? [])->map(fn (Shift $s) => [
                    'id' => $s->id,
                    'kind' => $s->kind,
                    'name' => $s->template?->name ?? ($s->isWork() ? 'Ажил' : 'Амралт'),
                    'code' => $s->template?->code,
                    'color' => $s->template?->color ?? ($s->isWork() ? '#6366f1' : '#94a3b8'),
                    'start_time' => ShiftMath::hm($s->start_time),
                    'end_time' => ShiftMath::hm($s->end_time),
                    'minutes' => $s->minutes(),
                    'branch' => $s->branch?->name,
                    'doctor' => $s->assignedDoctor?->short_name,
                    'room' => $s->room,
                    'note' => $s->note,
                    'swap_pending' => $openSwapShiftIds->has($s->id),
                ])->values(),
                'leave' => $leave,
                'unavailable' => $availability->has($date) ? ['id' => $availability[$date]->id, 'note' => $availability[$date]->note] : null,
                // Ажилтанд зөвхөн ирсэн/тарсан/ажилласан цаг ба хоцролт — илүү цаг, эрт явсныг HR л харна.
                'attendance' => $log || ($eval && $eval['status']) ? [
                    'in' => $log?->checked_in_at?->format('H:i'),
                    'out' => $log?->checked_out_at?->format('H:i'),
                    'status' => $eval['status'] ?? null,
                    'late' => $eval['late'] ?? 0,
                    'worked' => $eval['worked'] ?? 0,
                ] : null,
            ];
        }

        return Inertia::render('my/work-schedule', [
            'employee' => [
                'id' => $employee->id,
                'full_name' => $employee->full_name,
                'position' => $employee->position?->name,
                'branch' => $employee->branch?->name,
                'photo_url' => $employee->photo_url,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
            ],
            'month' => $start->format('Y-m'),
            'days' => $days,
            'swaps' => $this->swaps($employee),
            'colleagues' => $this->colleagues($employee),
            'late_grace' => ScheduleSettings::lateGrace(),
        ]);
    }

    /** "Энэ өдөр боломжгүй" тэмдэглэх / болих. */
    public function toggleAvailability(Request $request): RedirectResponse
    {
        $employee = $this->employee();
        $data = $request->validate([
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'note' => 'nullable|string|max:255',
        ], ['date.after_or_equal' => 'Өнгөрсөн өдрийг тэмдэглэх боломжгүй.']);

        $existing = ScheduleAvailability::where('employee_id', $employee->id)->whereDate('date', $data['date'])->first();
        if ($existing) {
            $existing->delete();

            return back()->with('success', 'Тэмдэглэгээ арилгагдлаа.');
        }

        ScheduleAvailability::create(['employee_id' => $employee->id, 'date' => $data['date'], 'note' => $data['note'] ?? null]);

        return back()->with('success', 'Боломжгүй өдөр тэмдэглэгдлээ — хуваарь гаргагчид харагдана.');
    }

    public function requestSwap(Request $request, ShiftSwapService $service): RedirectResponse
    {
        $employee = $this->employee();
        $data = $request->validate([
            'shift_id' => 'required|integer|exists:shifts,id',
            'target_employee_id' => 'required|integer|exists:employees,id',
            'target_shift_id' => 'nullable|integer|exists:shifts,id',
            'note' => 'nullable|string|max:500',
        ]);

        $service->request(
            $employee,
            Shift::findOrFail($data['shift_id']),
            Employee::findOrFail($data['target_employee_id']),
            ! empty($data['target_shift_id']) ? Shift::findOrFail($data['target_shift_id']) : null,
            $data['note'] ?? null,
        );

        return back()->with('success', 'Хүсэлт илгээгдлээ. Хамт ажилтан зөвшөөрсний дараа HR батална.');
    }

    public function respondSwap(Request $request, ShiftSwapRequest $swap, ShiftSwapService $service): RedirectResponse
    {
        $data = $request->validate(['accept' => 'required|boolean']);
        $service->respond($swap, $this->employee(), (bool) $data['accept']);

        return back()->with('success', $data['accept'] ? 'Зөвшөөрлөө — HR-ийн шийдвэрийг хүлээнэ үү.' : 'Татгалзлаа.');
    }

    public function cancelSwap(ShiftSwapRequest $swap, ShiftSwapService $service): RedirectResponse
    {
        $service->cancel($swap, $this->employee());

        return back()->with('success', 'Хүсэлт цуцлагдлаа.');
    }

    private function employee(): Employee
    {
        $employee = ProfileController::resolveEmployee();
        abort_unless($employee, 403, 'Ажилтны бүртгэл олдсонгүй.');

        return $employee;
    }

    private function swaps(Employee $employee): array
    {
        return ShiftSwapRequest::with(['requester', 'target', 'shift.template', 'shift.branch', 'targetShift.template', 'targetShift.branch'])
            ->where(fn ($q) => $q->where('requester_id', $employee->id)->orWhere('target_employee_id', $employee->id))
            ->where(fn ($q) => $q->whereIn('status', [ShiftSwapRequest::PENDING_PEER, ShiftSwapRequest::PENDING_APPROVAL])
                ->orWhere('updated_at', '>=', now()->subDays(14)))
            ->latest()->limit(30)->get()
            ->map(function (ShiftSwapRequest $s) use ($employee) {
                $outgoing = $s->requester_id === $employee->id;

                return [
                    'id' => $s->id,
                    'direction' => $outgoing ? 'out' : 'in',
                    'status' => $s->status,
                    'status_label' => ShiftSwapRequest::STATUS_LABELS[$s->status] ?? $s->status,
                    'is_swap' => $s->isSwap(),
                    'other' => $outgoing ? $s->target?->short_name : $s->requester?->short_name,
                    'shift' => $s->shift ? $s->shift->date->format('m/d').' · '.$s->shift->label() : null,
                    'target_shift' => $s->targetShift ? $s->targetShift->date->format('m/d').' · '.$s->targetShift->label() : null,
                    'note' => $s->note,
                    'rejection_reason' => $s->rejection_reason,
                    'can_respond' => ! $outgoing && $s->status === ShiftSwapRequest::PENDING_PEER,
                    'can_cancel' => $outgoing && $s->isOpen(),
                ];
            })->all();
    }

    /** Ээлж шилжүүлэх боломжтой хамт ажилтнууд (нэг салбар, ижил албан тушаал эхэнд) ба тэдний ойрын ээлж. */
    private function colleagues(Employee $employee): array
    {
        $colleagues = Employee::with('position:id,name')->where('status', 'active')
            ->where('id', '!=', $employee->id)
            ->where('branch_id', $employee->branch_id)
            ->get();

        $upcoming = Shift::published()->work()->with(['template:id,name,code', 'branch:id,name'])
            ->whereIn('employee_id', $colleagues->pluck('id'))
            ->whereBetween('date', [today()->toDateString(), today()->addDays(45)->toDateString()])
            ->orderBy('date')->get()->groupBy('employee_id');

        return $colleagues
            ->sortBy(fn (Employee $e) => [$e->position_id === $employee->position_id ? 0 : 1, $e->first_name])
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'name' => $e->short_name,
                'position' => $e->position?->name,
                'same_position' => $e->position_id === $employee->position_id,
                'shifts' => ($upcoming->get($e->id) ?? collect())->map(fn (Shift $s) => [
                    'id' => $s->id, 'date' => $s->date->toDateString(), 'label' => $s->label(),
                ])->values(),
            ])->values()->all();
    }
}
