<?php

namespace App\Http\Controllers\HR;

use App\Exports\AttendanceExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\AttendancePunch;
use App\Models\HR\Employee;
use App\Services\Attendance\AttendanceIngestService;
use App\Services\Attendance\AttendanceReport;
use App\Services\Schedule\ScheduleSettings;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceIngestService $attendance) {}

    public function index(): Response
    {
        $month = request()->integer('month', now()->month);
        $year = request()->integer('year', now()->year);

        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to = $from->copy()->endOfMonth();

        $employeeId = request()->integer('employee_id', 0) ?: null;
        $branchId = request()->integer('branch_id', 0) ?: null;

        // Ирцийг НИЙТЛЭГДСЭН хуваарьтай харьцуулж хоцролт/эрт явсан/илүү цаг/ирээгүйг тооцно.
        $report = (new AttendanceReport($from->toDateString(), $to->toDateString(), $branchId, $employeeId))->build();

        // Салбар сонгосон бол эмчийн «Мөн ажилладаг салбарууд»-аар тэнд ажилладаг хүмүүсийг ч гаргана.
        $employees = Employee::with('doctor.branches:id')->where('status', 'active')->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'branch_id'])
            ->when($branchId, fn ($list) => $list->filter(fn (Employee $e) => in_array($branchId, $e->workBranchIds(), true)))
            ->values();

        return Inertia::render('hr/attendance/index', [
            'logs' => $report['rows'],
            'summary' => $report['summary'],
            'rules' => [
                'late_grace' => ScheduleSettings::lateGrace(),
                'overtime_min' => ScheduleSettings::overtimeMin(),
            ],
            'employees' => $employees->map(fn ($e) => ['id' => $e->id, 'name' => $e->full_name]),
            'branches' => Branch::orderBy('order')->get(['id', 'name']),
            'year' => $year,
            'month' => $month,
            'employee_id' => $employeeId,
            'branch_id' => $branchId,
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

    public function exportExcel(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $month = request()->integer('month', now()->month);
        $year = request()->integer('year', now()->year);
        $employeeId = request()->integer('employee_id', 0) ?: null;
        $branchId = request()->integer('branch_id', 0) ?: null;

        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to = $from->copy()->endOfMonth();

        $report = (new AttendanceReport($from->toDateString(), $to->toDateString(), $branchId, $employeeId))->build();

        $monthLabels = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
            '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
        $monthLabel = $monthLabels[$month - 1];

        return Excel::download(new AttendanceExport($report['rows'], $report['summary']), "Ирцийн бүртгэл {$monthLabel} {$year}.xlsx");
    }
}
