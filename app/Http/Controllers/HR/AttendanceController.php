<?php

namespace App\Http\Controllers\HR;

use App\Exports\AttendanceExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\AttendancePunch;
use App\Models\HR\Employee;
use App\Services\Attendance\AttendanceIngestService;
use App\Services\Attendance\AttendancePeriod;
use App\Services\Attendance\AttendanceReport;
use App\Services\Schedule\ScheduleSettings;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceIngestService $attendance) {}

    /**
     * Ирцийн хуудас — хоёр харагдацтай:
     *   day    — нэг өдрийн ирц, салбар салбараар (өдрийн мөр + долоо хоногийн тойм)
     *   report — бүх ажилтны 15 хоног / сар / улирал / хагас жил / жилийн нэгтгэл
     */
    public function index(Request $request): Response
    {
        $view = $request->query('view') === 'report' ? 'report' : 'day';

        $props = [
            'view' => $view,
            'rules' => [
                'late_grace' => ScheduleSettings::lateGrace(),
                'overtime_min' => ScheduleSettings::overtimeMin(),
            ],
            'employees' => $this->employeeOptions(),
            'branches' => Branch::orderBy('order')->get(['id', 'name']),
            'branch_id' => $request->integer('branch_id', 0) ?: null,
        ];

        if ($view === 'report') {
            // Ирцийг НИЙТЛЭГДСЭН хуваарьтай харьцуулж хоцролт/эрт явсан/илүү цаг/ирээгүйг тооцно.
            $period = AttendancePeriod::make($request->query('period'), $request->query('date'));
            $report = (new AttendanceReport($period->from->toDateString(), $period->to->toDateString()))->build(withRows: false);

            return Inertia::render('hr/attendance/index', $props + [
                'period' => $period->toArray(),
                'summary' => $report['summary'],
            ]);
        }

        $date = $this->dayParam($request);
        $monday = Carbon::parse($date)->startOfWeek(Carbon::MONDAY);
        $sunday = $monday->copy()->addDays(6);

        // Долоо хоногийг нэг дор тооцоолж, сонгосон өдрийн мөр + бусад өдрийн товч тоог гаргана.
        $week = (new AttendanceReport($monday->toDateString(), $sunday->toDateString()))->build(withPending: true);
        $rows = collect($week['rows']);

        return Inertia::render('hr/attendance/index', $props + [
            'date' => $date,
            'logs' => $rows->where('date', $date)->values(),
            'week' => collect(CarbonPeriod::create($monday, $sunday))->map(fn (Carbon $d) => [
                'date' => $d->toDateString(),
                // Салбараар шүүхэд front-д тоолно
                'rows' => $rows->where('date', $d->toDateString())
                    ->map(fn ($r) => ['b' => $r['branch_id'], 's' => $r['status'], 'in' => $r['checked_in_at'] !== null])
                    ->values(),
            ])->values(),
        ]);
    }

    /**
     * Нэг ажилтны ирцийн тайлан — 15 хоног / сар / улирал / хагас жил / жил.
     * Олон сартай үеийг сар бүрээр задлана.
     */
    public function employee(Request $request, Employee $employee): Response
    {
        $period = AttendancePeriod::make($request->query('period'), $request->query('date'));
        $from = $period->from->toDateString();
        $to = $period->to->toDateString();

        $report = (new AttendanceReport($from, $to, null, $employee->id))->build(withPending: true);

        $months = [];
        if (count($period->months()) > 1) {
            foreach ($period->months() as [$mFrom, $mTo]) {
                $months[] = [
                    'from' => $mFrom,
                    'to' => $mTo,
                    'summary' => (new AttendanceReport($mFrom, $mTo, null, $employee->id))->build(withRows: false)['summary'][0] ?? null,
                ];
            }
        }

        $employee->loadMissing(['position:id,name', 'branch:id,name']);

        return Inertia::render('hr/attendance/employee', [
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->full_name,
                'short_name' => $employee->short_name,
                'number' => $employee->employee_number,
                'position' => $employee->position?->name,
                'branch' => $employee->branch?->name,
                'photo_url' => $employee->photo_url,
                'status' => $employee->status,
            ],
            'period' => $period->toArray(),
            'summary' => $report['summary'][0] ?? null,
            'logs' => $report['rows'],
            'months' => $months,
            'rules' => [
                'late_grace' => ScheduleSettings::lateGrace(),
                'overtime_min' => ScheduleSettings::overtimeMin(),
            ],
            'employees' => $this->employeeOptions(),
        ]);
    }

    /**
     * Нэг ажилтны нэг өдрийн бүх түүхий бүртгэл — засах цонхонд харуулна.
     */
    public function day(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', Rule::exists('employees', 'id')],
            'date' => 'required|date_format:Y-m-d',
        ]);

        $punches = AttendancePunch::with(['device:id,name', 'creator:id,name'])
            ->where('employee_id', $data['employee_id'])
            ->whereBetween('punched_at', ["{$data['date']} 00:00:00", "{$data['date']} 23:59:59"])
            ->orderBy('punched_at')
            ->get()
            ->map(fn (AttendancePunch $p) => [
                'id' => $p->id,
                'time' => $p->punched_at->format('H:i:s'),
                'source' => $p->source,
                'punch_type' => $p->punch_type,
                'device_name' => $p->device?->name,
                'note' => $p->note,
                'created_by' => $p->creator?->name,
                'created_at' => $p->created_at?->format('Y-m-d H:i'),
                'can_delete' => $p->source === AttendancePunch::SOURCE_MANUAL,
            ]);

        return response()->json(['punches' => $punches]);
    }

    /**
     * HR гараар ирсэн/тарсан цаг нэмнэ — хуруу дарахаа мартсан үед. Шалтгаан заавал.
     */
    public function storeManual(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', Rule::exists('employees', 'id')],
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'checked_in_at' => 'nullable|date_format:H:i|required_without:checked_out_at',
            'checked_out_at' => ['nullable', 'date_format:H:i', Rule::when($request->filled('checked_in_at'), 'after:checked_in_at')],
            'note' => 'required|string|min:3|max:255',
        ], [
            'checked_in_at.required_without' => 'Ирсэн эсвэл тарсан цагийн аль нэгийг оруулна уу.',
            'checked_out_at.after' => 'Тарсан цаг ирсэн цагаас хойш байх ёстой.',
            'note.required' => 'Яагаад гараар нэмж байгаагаа бичнэ үү (жишээ: хуруу дарахаа мартсан).',
            'date.before_or_equal' => 'Ирээдүйн өдөрт ирц нэмэх боломжгүй.',
        ]);

        $employee = Employee::findOrFail($data['employee_id']);

        $this->attendance->addManualPunches(
            $employee, $data['date'], $data['checked_in_at'] ?? null, $data['checked_out_at'] ?? null,
            $data['note'], $request->user(),
        );

        return back()->with('success', "{$employee->short_name}-ийн ирц засагдлаа.");
    }

    /**
     * Гараар нэмсэн бүртгэлийг устгана. Төхөөрөмж/утаснаас ирсэн бүртгэлийг устгахгүй.
     */
    public function destroyPunch(AttendancePunch $punch): RedirectResponse
    {
        if ($punch->source !== AttendancePunch::SOURCE_MANUAL) {
            return back()->with('error', 'Төхөөрөмж эсвэл утаснаас ирсэн бүртгэлийг устгах боломжгүй.');
        }

        $this->attendance->deleteManualPunch($punch);

        return back()->with('success', 'Гараар нэмсэн бүртгэл устгагдлаа.');
    }

    public function exportExcel(Request $request): BinaryFileResponse
    {
        $employeeId = $request->integer('employee_id', 0) ?: null;
        $branchId = $request->integer('branch_id', 0) ?: null;

        if ($request->query('view') === 'day') {
            $from = $to = $this->dayParam($request);
            $label = $from;
        } else {
            $period = AttendancePeriod::make($request->query('period'), $request->query('date'));
            [$from, $to] = [$period->from->toDateString(), $period->to->toDateString()];
            $label = $period->label();
        }

        $report = (new AttendanceReport($from, $to, $branchId, $employeeId))->build();

        $who = $employeeId ? ' - '.Employee::find($employeeId)?->full_name : '';

        return Excel::download(new AttendanceExport($report['rows'], $report['summary']), "Ирцийн бүртгэл{$who} {$label}.xlsx");
    }

    /** Өдрийн харагдацын огноо — буруу эсвэл ирээдүйн огноо бол өнөөдөр. */
    private function dayParam(Request $request): string
    {
        $date = AttendancePeriod::parseDate($request->query('date'));

        return $date && $date->toDateString() <= today()->toDateString() ? $date->toDateString() : today()->toDateString();
    }

    /** @return Collection<int, array{id: int, name: string, branch_id: ?int}> */
    private function employeeOptions()
    {
        return Employee::where('status', 'active')->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'branch_id'])
            ->map(fn (Employee $e) => ['id' => $e->id, 'name' => $e->full_name, 'branch_id' => $e->branch_id]);
    }
}
