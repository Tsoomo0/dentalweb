<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\Doctor;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DailySheetAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $mode     = $request->get('mode', 'day');
        $date     = $request->get('date', now()->toDateString());
        $month    = $request->get('month', now()->format('Y-m'));
        $doctorId = $request->get('doctorId');
        $branchId = $request->get('branchId');

        [$year, $mon] = explode('-', $month);

        $sheetsQuery = DailySheet::with(['branch', 'receptionist', 'morningReceptionist', 'entries.doctor', 'entries.user'])
            ->when($mode === 'month',
                fn($q) => $q->whereYear('date', $year)->whereMonth('date', $mon),
                fn($q) => $q->whereDate('date', $date)
            )
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->orderBy('date', 'desc')
            ->orderBy('branch_id');

        $sheets = $sheetsQuery->get()->map(fn($sheet) => $this->mapSheet($sheet, $doctorId));

        if ($doctorId) {
            $sheets = $sheets->filter(fn($s) => count($s['entries']) > 0)->values();
        }

        $outstandingEntries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('outstanding_amount', '>', 0)
            ->when($doctorId, fn($q) => $q->where('doctor_id', $doctorId))
            ->whereHas('dailySheet', fn($q) => $q
                ->when($mode === 'month',
                    fn($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon),
                    fn($q2) => $q2->whereDate('date', $date)
                )
                ->when($branchId, fn($q2) => $q2->where('branch_id', $branchId))
            )
            ->orderByRaw('outstanding_paid_at IS NOT NULL')
            ->orderByDesc('id')
            ->get()
            ->map(fn($e) => [
                'id'                  => $e->id,
                'date'                => $e->dailySheet->date->toDateString(),
                'branch'              => $e->dailySheet->branch?->name,
                'patient_name'        => $e->patient_name,
                'diagnosis'           => $e->diagnosis,
                'outstanding_amount'  => $e->outstanding_amount,
                'outstanding_paid_at' => $e->outstanding_paid_at?->toDateTimeString(),
                'doctor_name'         => $e->doctor?->name,
                'receptionist_name'   => $e->user?->name,
            ])
            ->values();

        $allEntries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->when($doctorId, fn($q) => $q->where('doctor_id', $doctorId))
            ->whereHas('dailySheet', fn($q) => $q
                ->when($mode === 'month',
                    fn($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon),
                    fn($q2) => $q2->whereDate('date', $date)
                )
                ->when($branchId, fn($q2) => $q2->where('branch_id', $branchId))
            )
            ->orderBy('id')
            ->get();

        $receptionRegistry = $allEntries
            ->groupBy('user_id')
            ->map(fn($entries) => [
                'receptionist_name'  => $entries->first()->user?->name ?? '—',
                'total_entries'      => $entries->count(),
                'total_amount'       => $entries->sum('total_amount'),
                'cash_amount'        => $entries->sum('cash_amount'),
                'card_amount'        => $entries->sum('card_amount'),
                'mobile_amount'      => $entries->sum('mobile_amount'),
                'storepay_amount'    => $entries->sum('storepay_amount'),
                'outstanding_amount' => $entries->sum('outstanding_amount'),
                'entries'            => $entries->map(fn($e) => [
                    'id'                 => $e->id,
                    'date'               => $e->dailySheet->date->toDateString(),
                    'branch'             => $e->dailySheet->branch?->name,
                    'patient_name'       => $e->patient_name,
                    'gender'             => $e->gender,
                    'diagnosis'          => $e->diagnosis,
                    'total_amount'       => $e->total_amount,
                    'cash_amount'        => $e->cash_amount,
                    'card_amount'        => $e->card_amount,
                    'mobile_amount'      => $e->mobile_amount,
                    'storepay_amount'    => $e->storepay_amount,
                    'outstanding_amount' => $e->outstanding_amount,
                    'doctor_name'        => $e->doctor?->name,
                ])->values()->all(),
            ])
            ->values();

        $doctors  = Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);

        $grandTotals = [
            'total_amount'       => $sheets->sum(fn($s) => $s['totals']['total_amount']),
            'cash_amount'        => $sheets->sum(fn($s) => $s['totals']['cash_amount']),
            'card_amount'        => $sheets->sum(fn($s) => $s['totals']['card_amount']),
            'storepay_amount'    => $sheets->sum(fn($s) => $s['totals']['storepay_amount']),
            'mobile_amount'      => $sheets->sum(fn($s) => $s['totals']['mobile_amount']),
            'outstanding_amount' => $sheets->sum(fn($s) => $s['totals']['outstanding_amount']),
            'discount'           => $sheets->sum(fn($s) => $s['totals']['discount']),
        ];

        return Inertia::render('admin/daily-sheets/index', [
            'sheets'             => $sheets->values(),
            'doctors'            => $doctors,
            'branches'           => $branches,
            'filters'            => compact('mode', 'date', 'month', 'doctorId', 'branchId'),
            'grandTotals'        => $grandTotals,
            'outstandingEntries' => $outstandingEntries,
            'receptionRegistry'  => $receptionRegistry,
        ]);
    }

    public function outstanding(Request $request): Response
    {
        $branchId = $request->get('branchId') ?: null;
        $status   = $request->get('status', 'all');
        $mode     = $request->get('mode', 'day');   // day | week | month | all
        $date     = $request->get('date', today()->toDateString());
        $month    = $request->get('month', today()->format('Y-m'));

        [$year, $mon] = explode('-', $month);

        $entries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('outstanding_amount', '>', 0)
            ->when($branchId, fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->where('branch_id', $branchId)))
            ->when($status === 'unpaid', fn($q) => $q->whereNull('outstanding_paid_at'))
            ->when($status === 'paid',   fn($q) => $q->whereNotNull('outstanding_paid_at'))
            ->when($mode === 'day',   fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereDate('date', $date)))
            ->when($mode === 'week',  fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereBetween('date', [
                now()->parse($date)->subDays(6)->toDateString(), $date
            ])))
            ->when($mode === 'month', fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon)))
            ->orderByRaw('outstanding_paid_at IS NOT NULL')
            ->orderByDesc('id')
            ->get()
            ->map(fn($e) => [
                'id'                       => $e->id,
                'date'                     => $e->dailySheet->date->toDateString(),
                'branch'                   => $e->dailySheet->branch?->name,
                'patient_name'             => $e->patient_name,
                'diagnosis'                => $e->diagnosis,
                'appointment_number'       => $e->appointment_number,
                'outstanding_amount'       => $e->outstanding_amount,
                'doctor_name'              => $e->doctor?->name,
                'receptionist_name'        => $e->user?->name,
                'days_since'               => (int) max(0,
                    (strtotime(today()->toDateString()) - strtotime($e->dailySheet->date->toDateString())) / 86400
                ),
                'is_paid'                  => $e->outstanding_paid_at !== null,
                'outstanding_paid_at'      => $e->outstanding_paid_at?->toDateString(),
                'outstanding_paid_method'  => $e->outstanding_paid_method,
                'outstanding_paid_receipt' => $e->outstanding_paid_receipt,
                'outstanding_paid_amount'  => $e->outstanding_paid_amount,
            ])
            ->values()
            ->all();

        $branches = Branch::orderBy('name')->get(['id', 'name']);

        return Inertia::render('admin/outstanding/index', [
            'entries'  => $entries,
            'branches' => $branches,
            'filters'  => compact('branchId', 'status', 'mode', 'date', 'month'),
        ]);
    }

    /** Илүү тооцоо — Admin view */
    public function overpaid(Request $request): Response
    {
        $branchId = $request->get('branchId') ?: null;
        $tab      = $request->get('tab', 'all'); // all | pending | used

        $entries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('overpaid_amount', '>', 0)
            ->when($branchId, fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->where('branch_id', $branchId)))
            ->when($tab === 'pending', fn($q) => $q->whereNull('overpaid_used_at'))
            ->when($tab === 'used',    fn($q) => $q->whereNotNull('overpaid_used_at'))
            ->orderByDesc('id')
            ->get()
            ->map(fn($e) => [
                'id'                    => $e->id,
                'date'                  => $e->dailySheet->date->toDateString(),
                'branch'                => $e->dailySheet->branch?->name,
                'patient_name'          => $e->patient_name,
                'diagnosis'             => $e->diagnosis,
                'appointment_number'    => $e->appointment_number,
                'overpaid_amount'       => (int) $e->overpaid_amount,
                'overpaid_used_at'      => $e->overpaid_used_at?->toDateTimeString(),
                'overpaid_used_receipt' => $e->overpaid_used_receipt,
                'overpaid_used_method'  => $e->overpaid_used_method,
                'overpaid_used_amount'  => $e->overpaid_used_amount,
                'doctor_name'           => $e->doctor?->name,
                'receptionist_name'     => $e->user?->name,
            ])->values()->all();

        return Inertia::render('admin/overpaid/index', [
            'entries'  => $entries,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'filters'  => compact('branchId', 'tab'),
        ]);
    }

    /** Буцаалт — Admin view */
    public function refunds(Request $request): Response
    {
        $branchId = $request->get('branchId') ?: null;
        $mode     = $request->get('mode', 'month'); // day | week | month | all
        $date     = $request->get('date', today()->toDateString());
        $month    = $request->get('month', today()->format('Y-m'));
        [$year, $mon] = explode('-', $month);

        $entries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('refund_amount', '>', 0)
            ->whereNotNull('refunded_at')
            ->when($branchId, fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->where('branch_id', $branchId)))
            ->when($mode === 'day',   fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereDate('date', $date)))
            ->when($mode === 'week',  fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereBetween('date', [
                now()->parse($date)->subDays(6)->toDateString(), $date
            ])))
            ->when($mode === 'month', fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon)))
            ->orderByDesc('refunded_at')
            ->get()
            ->map(fn($e) => [
                'id'                  => $e->id,
                'date'                => $e->dailySheet->date->toDateString(),
                'branch'              => $e->dailySheet->branch?->name,
                'patient_name'        => $e->patient_name,
                'diagnosis'           => $e->diagnosis,
                'appointment_number'  => $e->appointment_number,
                'refund_amount'       => (int) $e->refund_amount,
                'refund_method'       => $e->refund_method,
                'refund_reason'       => $e->refund_reason,
                'refunded_at'         => $e->refunded_at?->toDateTimeString(),
                'doctor_name'         => $e->doctor?->name,
                'receptionist_name'   => $e->user?->name,
            ])->values()->all();

        $totalSelected = collect($entries)->sum('refund_amount');

        return Inertia::render('admin/refunds/index', [
            'entries'       => $entries,
            'branches'      => Branch::orderBy('name')->get(['id', 'name']),
            'filters'       => compact('branchId', 'mode', 'date', 'month'),
            'totalSelected' => (int) $totalSelected,
        ]);
    }

    public function exportOutstanding(Request $request): StreamedResponse
    {
        $branchId = $request->get('branchId') ?: null;
        $status   = $request->get('status', 'all');
        $mode     = $request->get('mode', 'day');
        $date     = $request->get('date', today()->toDateString());
        $month    = $request->get('month', today()->format('Y-m'));

        [$year, $mon] = explode('-', $month);

        $entries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('outstanding_amount', '>', 0)
            ->when($branchId, fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->where('branch_id', $branchId)))
            ->when($status === 'unpaid', fn($q) => $q->whereNull('outstanding_paid_at'))
            ->when($status === 'paid',   fn($q) => $q->whereNotNull('outstanding_paid_at'))
            ->when($mode === 'day',   fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereDate('date', $date)))
            ->when($mode === 'week',  fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereBetween('date', [
                now()->parse($date)->subDays(6)->toDateString(), $date
            ])))
            ->when($mode === 'month', fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon)))
            ->orderByRaw('outstanding_paid_at IS NOT NULL')
            ->orderByDesc('id')
            ->get();

        $filename = 'outstanding-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($entries) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, [
                'Огноо', 'Салбар', 'Үйлчлүүлэгч', 'Оношилгоо', 'Баримт №',
                'Дутуу дүн', 'Эмч', 'Ресепшн', 'Статус',
                'Төлсөн дүн', 'Хэлбэр', 'Баримтын дугаар', 'Төлсөн огноо',
            ]);
            foreach ($entries as $e) {
                fputcsv($handle, [
                    $e->dailySheet->date->format('Y-m-d'),
                    $e->dailySheet->branch?->name ?? '',
                    $e->patient_name ?? '',
                    $e->diagnosis ?? '',
                    $e->appointment_number ?? '',
                    $e->outstanding_amount,
                    $e->doctor?->name ?? '',
                    $e->user?->name ?? '',
                    $e->outstanding_paid_at ? 'Төлөгдсөн' : 'Дутуу',
                    $e->outstanding_paid_amount ?? '',
                    $e->outstanding_paid_method ?? '',
                    $e->outstanding_paid_receipt ?? '',
                    $e->outstanding_paid_at?->format('Y-m-d') ?? '',
                ]);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function destroy(Request $request, DailySheet $sheet): RedirectResponse
    {
        $request->validate(['code' => 'required|string']);

        $correct = Setting::where('key', 'daily_sheet_code')->value('value') ?? '1234';

        if ($request->input('code') !== $correct) {
            return back()->withErrors(['code' => 'Код буруу байна.']);
        }

        $sheet->delete();

        return back()->with('success', 'Тооцоо устгагдлаа.');
    }

    public function destroyEntry(Request $request, DailySheetEntry $entry): RedirectResponse
    {
        $request->validate(['code' => 'required|string']);

        $correct = Setting::where('key', 'daily_sheet_code')->value('value') ?? '1234';

        if ($request->input('code') !== $correct) {
            return back()->withErrors(['code' => 'Код буруу байна.']);
        }

        $entry->delete();

        return back()->with('success', 'Мөр устгагдлаа.');
    }

    public function unlock(Request $request, DailySheet $sheet): RedirectResponse
    {
        $request->validate(['code' => 'required|string']);

        $correct = Setting::where('key', 'daily_sheet_code')->value('value') ?? '1234';

        if ($request->input('code') !== $correct) {
            return back()->withErrors(['code' => 'Код буруу байна.']);
        }

        $sheet->update([
            'submitted_at'            => null,
            'receptionist_id'         => null,
            'morning_submitted_at'    => null,
            'morning_receptionist_id' => null,
        ]);

        $sheet->entries()->update(['is_morning_entry' => false]);

        return back()->with('success', 'Тооцоо нээгдлээ. Ресепшн засварлах боломжтой болов.');
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $mode     = $request->get('mode', 'day');
        $date     = $request->get('date', now()->toDateString());
        $month    = $request->get('month', now()->format('Y-m'));
        $doctorId = $request->get('doctorId');
        $branchId = $request->get('branchId');

        [$year, $mon] = explode('-', $month);

        $sheets = DailySheet::with(['branch', 'entries.doctor', 'entries.user'])
            ->when($mode === 'month',
                fn($q) => $q->whereYear('date', $year)->whereMonth('date', $mon),
                fn($q) => $q->whereDate('date', $date)
            )
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->orderBy('date')
            ->orderBy('branch_id')
            ->get();

        $filename = $mode === 'month' ? "daily-sheets-{$month}.csv" : "daily-sheets-{$date}.csv";

        return response()->streamDownload(function () use ($sheets, $doctorId) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, [
                'Огноо', 'Салбар', 'Үйлчлүүлэгч', 'Хүйс', 'Оноош',
                'Захиалгын №', 'Хөнгөлөлт', 'Мобайл', 'Карт', 'Бэлэн',
                'Storepay', 'Нийт дүн', 'Дутуу', 'Эмч', 'Ресепшн',
            ]);
            foreach ($sheets as $sheet) {
                $entries = $sheet->entries;
                if ($doctorId) {
                    $entries = $entries->filter(fn($e) => $e->doctor_id == $doctorId);
                }
                foreach ($entries as $e) {
                    fputcsv($handle, [
                        $sheet->date->format('Y-m-d'),
                        $sheet->branch?->name ?? '',
                        $e->patient_name ?? '',
                        $e->gender ?? '',
                        $e->diagnosis ?? '',
                        $e->appointment_number ?? '',
                        $e->discount,
                        $e->mobile_amount,
                        $e->card_amount,
                        $e->cash_amount,
                        $e->storepay_amount,
                        $e->total_amount,
                        $e->outstanding_amount,
                        $e->doctor?->name ?? '',
                        $e->user?->name ?? '',
                    ]);
                }
            }
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function mapSheet(DailySheet $sheet, ?string $doctorId): array
    {
        $entries = $sheet->entries;

        if ($doctorId) {
            $entries = $entries->filter(fn($e) => $e->doctor_id == $doctorId)->values();
        }

        $totals = [
            'total_amount'       => $entries->sum('total_amount'),
            'discount'           => $entries->sum('discount'),
            'mobile_amount'      => $entries->sum('mobile_amount'),
            'card_amount'        => $entries->sum('card_amount'),
            'cash_amount'        => $entries->sum('cash_amount'),
            'storepay_amount'    => $entries->sum('storepay_amount'),
            'outstanding_amount' => $entries->sum('outstanding_amount'),
        ];

        return [
            'id'                   => $sheet->id,
            'date'                 => $sheet->date->toDateString(),
            'branch'               => $sheet->branch?->name,
            'branch_id'            => $sheet->branch_id,
            'is_confirmed'         => $sheet->submitted_at !== null,
            'submitted_at'         => $sheet->submitted_at?->toDateTimeString(),
            'receptionist'         => $sheet->receptionist?->name,
            'morning_confirmed'    => $sheet->morning_submitted_at !== null,
            'morning_submitted_at' => $sheet->morning_submitted_at?->toDateTimeString(),
            'morning_receptionist' => $sheet->morningReceptionist?->name,
            'totals'               => $totals,
            'entries'              => $entries->map(fn($e) => [
                'id'                        => $e->id,
                'patient_name'              => $e->patient_name,
                'gender'                    => $e->gender,
                'diagnosis'                 => $e->diagnosis,
                'appointment_number'        => $e->appointment_number,
                'gross_amount'              => $e->gross_amount,
                'discount'                  => $e->discount,
                'mobile_amount'             => $e->mobile_amount,
                'card_amount'               => $e->card_amount,
                'cash_amount'               => $e->cash_amount,
                'storepay_amount'           => $e->storepay_amount,
                'total_amount'              => $e->total_amount,
                'outstanding_amount'        => $e->outstanding_amount,
                'doctor_id'                 => $e->doctor_id,
                'doctor_name'               => $e->doctor?->name,
                'technician_employee_id'    => $e->technician_employee_id,
                'technician_name'           => $e->technician_employee_id
                    ? (fn($emp) => $emp ? trim($emp->last_name . ' ' . $emp->first_name) : null)(
                        \DB::table('employees')->where('id', $e->technician_employee_id)->first(['first_name', 'last_name'])
                    )
                    : null,
                'receptionist_name'         => $e->user?->name,
                'supply_orthodontic_brush'  => (int) $e->supply_orthodontic_brush,
                'supply_interdental_brush'  => (int) $e->supply_interdental_brush,
                'supply_dental_floss'       => (int) $e->supply_dental_floss,
                'supply_wax'                => (int) $e->supply_wax,
                'supply_retainer_case'      => (int) $e->supply_retainer_case,
                'supply_removable_app_case' => (int) $e->supply_removable_app_case,
                'entry_notes'               => $e->entry_notes,
                'is_morning_entry'          => (bool) $e->is_morning_entry,
                'overpaid_amount'           => (int) $e->overpaid_amount,
                'overpaid_used_at'          => $e->overpaid_used_at?->toDateTimeString(),
            ])->values()->all(),
        ];
    }
}
