<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\Doctor;
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

        $sheetsQuery = DailySheet::with(['branch', 'receptionist', 'entries.doctor', 'entries.user'])
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
            'id'           => $sheet->id,
            'date'         => $sheet->date->toDateString(),
            'branch'       => $sheet->branch?->name,
            'branch_id'    => $sheet->branch_id,
            'is_confirmed' => $sheet->submitted_at !== null,
            'submitted_at' => $sheet->submitted_at?->toDateTimeString(),
            'receptionist' => $sheet->receptionist?->name,
            'totals'       => $totals,
            'entries'      => $entries->map(fn($e) => [
                'id'                 => $e->id,
                'patient_name'       => $e->patient_name,
                'gender'             => $e->gender,
                'diagnosis'          => $e->diagnosis,
                'appointment_number' => $e->appointment_number,
                'discount'           => $e->discount,
                'mobile_amount'      => $e->mobile_amount,
                'card_amount'        => $e->card_amount,
                'cash_amount'        => $e->cash_amount,
                'storepay_amount'    => $e->storepay_amount,
                'total_amount'       => $e->total_amount,
                'outstanding_amount' => $e->outstanding_amount,
                'doctor_id'          => $e->doctor_id,
                'doctor_name'        => $e->doctor?->name,
                'receptionist_name'  => $e->user?->name,
            ])->values()->all(),
        ];
    }
}
