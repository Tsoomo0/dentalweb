<?php

namespace App\Http\Controllers\Admin;

use App\Events\DailySheetUpdated;
use App\Exports\DailySheetExport;
use App\Exports\OutstandingExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\Doctor;
use App\Models\OverpaidUsage;
use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DailySheetAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $mode = $request->get('mode', 'day');
        $date = $request->get('date', now()->toDateString());
        $month = $request->get('month', now()->format('Y-m'));
        $doctorId = $request->get('doctorId');
        $branchId = $request->get('branchId');

        [$year, $mon] = explode('-', $month);

        $sheetsQuery = DailySheet::with(['branch', 'receptionist', 'morningReceptionist', 'entries.doctor', 'entries.user'])
            ->when($mode === 'month',
                fn ($q) => $q->whereYear('date', $year)->whereMonth('date', $mon),
                fn ($q) => $q->whereDate('date', $date)
            )
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->orderBy('date', 'desc')
            ->orderBy('branch_id');

        $sheets = $sheetsQuery->get()->map(fn ($sheet) => $this->mapSheet($sheet, $doctorId));

        if ($doctorId) {
            $sheets = $sheets->filter(fn ($s) => count($s['entries']) > 0)->values();
        }

        $outstandingEntries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('outstanding_amount', '>', 0)
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->whereHas('dailySheet', fn ($q) => $q
                ->when($mode === 'month',
                    fn ($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon),
                    fn ($q2) => $q2->whereDate('date', $date)
                )
                ->when($branchId, fn ($q2) => $q2->where('branch_id', $branchId))
            )
            ->orderByRaw('outstanding_paid_at IS NOT NULL')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'date' => $e->dailySheet->date->toDateString(),
                'branch' => $e->dailySheet->branch?->name,
                'patient_name' => $e->patient_name,
                'diagnosis' => $e->diagnosis,
                'outstanding_amount' => $e->outstanding_amount,
                'outstanding_paid_at' => $e->outstanding_paid_at?->toDateTimeString(),
                'doctor_name' => $e->doctor?->name,
                'receptionist_name' => $e->user?->name,
            ])
            ->values();

        $allEntries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->whereHas('dailySheet', fn ($q) => $q
                ->when($mode === 'month',
                    fn ($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon),
                    fn ($q2) => $q2->whereDate('date', $date)
                )
                ->when($branchId, fn ($q2) => $q2->where('branch_id', $branchId))
            )
            ->orderBy('id')
            ->get();

        $receptionRegistry = $allEntries
            ->groupBy('user_id')
            ->map(fn ($entries) => [
                'receptionist_name' => $entries->first()->user?->name ?? '—',
                'total_entries' => $entries->count(),
                'total_amount' => $entries->sum('total_amount'),
                'cash_amount' => $entries->sum('cash_amount'),
                'card_amount' => $entries->sum('card_amount'),
                'mobile_amount' => $entries->sum('mobile_amount'),
                'storepay_amount' => $entries->sum('storepay_amount'),
                'outstanding_amount' => $entries->sum('outstanding_amount'),
                'entries' => $entries->map(fn ($e) => [
                    'id' => $e->id,
                    'date' => $e->dailySheet->date->toDateString(),
                    'branch' => $e->dailySheet->branch?->name,
                    'patient_name' => $e->patient_name,
                    'gender' => $e->gender,
                    'diagnosis' => $e->diagnosis,
                    'total_amount' => $e->total_amount,
                    'cash_amount' => $e->cash_amount,
                    'card_amount' => $e->card_amount,
                    'mobile_amount' => $e->mobile_amount,
                    'storepay_amount' => $e->storepay_amount,
                    'outstanding_amount' => $e->outstanding_amount,
                    'doctor_name' => $e->doctor?->name,
                ])->values()->all(),
            ])
            ->values();

        $doctors = Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $branches = Branch::orderBy('name')->get(['id', 'name']);

        $grandTotals = [
            'total_amount' => $sheets->sum(fn ($s) => $s['totals']['total_amount']),
            'cash_amount' => $sheets->sum(fn ($s) => $s['totals']['cash_amount']),
            'card_amount' => $sheets->sum(fn ($s) => $s['totals']['card_amount']),
            'storepay_amount' => $sheets->sum(fn ($s) => $s['totals']['storepay_amount']),
            'mobile_amount' => $sheets->sum(fn ($s) => $s['totals']['mobile_amount']),
            'outstanding_amount' => $sheets->sum(fn ($s) => $s['totals']['outstanding_amount']),
            'discount' => $sheets->sum(fn ($s) => $s['totals']['discount']),
        ];

        return Inertia::render('admin/daily-sheets/index', [
            'sheets' => $sheets->values(),
            'doctors' => $doctors,
            'branches' => $branches,
            'filters' => compact('mode', 'date', 'month', 'doctorId', 'branchId'),
            'grandTotals' => $grandTotals,
            'outstandingEntries' => $outstandingEntries,
            'receptionRegistry' => $receptionRegistry,
        ]);
    }

    public function outstanding(Request $request): Response
    {
        $branchId = $request->get('branchId') ?: null;
        $status = $request->get('status', 'all');
        $mode = $request->get('mode', 'day');   // day | week | month | all
        $date = $request->get('date', today()->toDateString());
        $month = $request->get('month', today()->format('Y-m'));

        [$year, $mon] = explode('-', $month);

        $entries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('outstanding_amount', '>', 0)
            ->when($branchId, fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->where('branch_id', $branchId)))
            ->when($status === 'unpaid', fn ($q) => $q->whereNull('outstanding_paid_at'))
            ->when($status === 'paid', fn ($q) => $q->whereNotNull('outstanding_paid_at'))
            ->when($mode === 'day', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereDate('date', $date)))
            ->when($mode === 'week', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereBetween('date', [
                now()->parse($date)->subDays(6)->toDateString(), $date,
            ])))
            ->when($mode === 'month', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon)))
            ->orderByRaw('outstanding_paid_at IS NOT NULL')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'date' => $e->dailySheet->date->toDateString(),
                'branch' => $e->dailySheet->branch?->name,
                'patient_name' => $e->patient_name,
                'diagnosis' => $e->diagnosis,
                'appointment_number' => $e->appointment_number,
                'outstanding_amount' => $e->outstanding_amount,
                'doctor_name' => $e->doctor?->name,
                'receptionist_name' => $e->user?->name,
                'days_since' => (int) max(0,
                    (strtotime(today()->toDateString()) - strtotime($e->dailySheet->date->toDateString())) / 86400
                ),
                'is_paid' => $e->outstanding_paid_at !== null,
                'outstanding_paid_at' => $e->outstanding_paid_at?->toDateString(),
                'outstanding_paid_method' => $e->outstanding_paid_method,
                'outstanding_paid_receipt' => $e->outstanding_paid_receipt,
                'outstanding_paid_amount' => $e->outstanding_paid_amount,
            ])
            ->values()
            ->all();

        $branches = Branch::orderBy('name')->get(['id', 'name']);

        return Inertia::render('admin/outstanding/index', [
            'entries' => $entries,
            'branches' => $branches,
            'filters' => compact('branchId', 'status', 'mode', 'date', 'month'),
        ]);
    }

    /** Илүү тооцоо — Admin view */
    public function overpaid(Request $request): Response
    {
        $branchId = $request->get('branchId') ?: null;
        $tab = $request->get('tab', 'all'); // all | pending | used

        // Хэсэгчилсэн ашиглалт overpaid_used_* багануудад бичигддэггүй (зөвхөн бүрэн
        // дуусахад) тул ресепшнтэй ижилхэн overpaid_usages дэвтрээс бодно.
        $all = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user', 'overpaidUsages.user'])
            ->where('overpaid_amount', '>', 0)
            ->when($branchId, fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->where('branch_id', $branchId)))
            ->orderByDesc('id')
            ->get()
            ->map(function ($e) {
                $used = (int) $e->overpaidUsages->sum('amount');

                return [
                    'id' => $e->id,
                    'date' => $e->dailySheet->date->toDateString(),
                    'branch' => $e->dailySheet->branch?->name,
                    'patient_name' => $e->patient_name,
                    'diagnosis' => $e->diagnosis,
                    'appointment_number' => $e->appointment_number,
                    'overpaid_amount' => (int) $e->overpaid_amount,
                    'used_amount' => $used,
                    'remaining_amount' => max(0, (int) $e->overpaid_amount - $used),
                    'usages' => $e->overpaidUsages
                        ->sortBy('created_at')
                        ->map(fn ($u) => [
                            'id' => $u->id,
                            'receipt' => $u->target_receipt,
                            'amount' => (int) $u->amount,
                            'method' => $u->method,
                            'target_date' => $u->target_date?->toDateString(),
                            'used_by' => $u->user?->name,
                        ])->values()->all(),
                    'doctor_name' => $e->doctor?->name,
                    'receptionist_name' => $e->user?->name,
                ];
            });

        $entries = $all
            ->when($tab === 'pending', fn ($c) => $c->where('remaining_amount', '>', 0))
            ->when($tab === 'used', fn ($c) => $c->where('used_amount', '>', 0))
            ->values()
            ->all();

        return Inertia::render('admin/overpaid/index', [
            'entries' => $entries,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'filters' => compact('branchId', 'tab'),
            // Таб солиход өөрчлөгдөхгүй байхаар бүх бичлэгээс бодно
            'counts' => [
                'all' => $all->count(),
                'pending' => $all->where('remaining_amount', '>', 0)->count(),
                'used' => $all->where('used_amount', '>', 0)->count(),
            ],
            'summary' => [
                'total' => (int) $all->sum('overpaid_amount'),
                'used' => (int) $all->sum('used_amount'),
                'remaining' => (int) $all->sum('remaining_amount'),
            ],
        ]);
    }

    /** Буцаалт — Admin view */
    public function refunds(Request $request): Response
    {
        $branchId = $request->get('branchId') ?: null;
        $mode = $request->get('mode', 'month'); // day | week | month | all
        $date = $request->get('date', today()->toDateString());
        $month = $request->get('month', today()->format('Y-m'));
        [$year, $mon] = explode('-', $month);

        $entries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('refund_amount', '>', 0)
            ->whereNotNull('refunded_at')
            ->when($branchId, fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->where('branch_id', $branchId)))
            ->when($mode === 'day', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereDate('date', $date)))
            ->when($mode === 'week', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereBetween('date', [
                now()->parse($date)->subDays(6)->toDateString(), $date,
            ])))
            ->when($mode === 'month', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon)))
            ->orderByDesc('refunded_at')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'date' => $e->dailySheet->date->toDateString(),
                'branch' => $e->dailySheet->branch?->name,
                'patient_name' => $e->patient_name,
                'diagnosis' => $e->diagnosis,
                'appointment_number' => $e->appointment_number,
                'refund_amount' => (int) $e->refund_amount,
                'refund_method' => $e->refund_method,
                'refund_reason' => $e->refund_reason,
                'refunded_at' => $e->refunded_at?->toDateTimeString(),
                'doctor_name' => $e->doctor?->name,
                'receptionist_name' => $e->user?->name,
            ])->values()->all();

        $totalSelected = collect($entries)->sum('refund_amount');

        return Inertia::render('admin/refunds/index', [
            'entries' => $entries,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
            'filters' => compact('branchId', 'mode', 'date', 'month'),
            'totalSelected' => (int) $totalSelected,
        ]);
    }

    public function exportOutstanding(Request $request): BinaryFileResponse
    {
        $branchId = $request->get('branchId') ?: null;
        $status = $request->get('status', 'all');
        $mode = $request->get('mode', 'day');
        $date = $request->get('date', today()->toDateString());
        $month = $request->get('month', today()->format('Y-m'));

        [$year, $mon] = explode('-', $month);

        $entries = DailySheetEntry::with(['dailySheet.branch', 'doctor', 'user'])
            ->where('outstanding_amount', '>', 0)
            ->when($branchId, fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->where('branch_id', $branchId)))
            ->when($status === 'unpaid', fn ($q) => $q->whereNull('outstanding_paid_at'))
            ->when($status === 'paid', fn ($q) => $q->whereNotNull('outstanding_paid_at'))
            ->when($mode === 'day', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereDate('date', $date)))
            ->when($mode === 'week', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereBetween('date', [
                now()->parse($date)->subDays(6)->toDateString(), $date,
            ])))
            ->when($mode === 'month', fn ($q) => $q->whereHas('dailySheet', fn ($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon)))
            ->orderByRaw('outstanding_paid_at IS NOT NULL')
            ->orderByDesc('id')
            ->get();

        $filename = 'outstanding-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(new OutstandingExport($entries), $filename);
    }

    /**
     * Дутуу тооцоог устгах — мөрийг биш, зөвхөн дутуу дүнг тэглэнэ.
     * Ингэснээр өдрийн тооцооны орлогын мөр хэвээр үлдэж, зөвхөн
     * дутуу тооцооны жагсаалтаас хасагдана.
     */
    public function destroyOutstanding(Request $request, DailySheetEntry $entry): RedirectResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'reason' => 'nullable|string|max:500',
        ]);

        $correct = Setting::where('key', 'daily_sheet_code')->value('value') ?? '1234';

        if ($validated['code'] !== $correct) {
            return back()->withErrors(['code' => 'Код буруу байна.']);
        }

        if ($entry->outstanding_paid_at !== null) {
            return back()->withErrors(['code' => 'Төлөгдсөн дутуу тооцоог устгах боломжгүй.']);
        }

        $amount = (int) $entry->outstanding_amount;

        if ($amount <= 0) {
            return back()->with('info', 'Энэ бичлэгт дутуу тооцоо алга байна.');
        }

        $entry->update(['outstanding_amount' => 0]);

        $entry->loadMissing('dailySheet.branch');

        $reason = trim($validated['reason'] ?? '');
        AuditService::log(
            'deleted',
            $entry,
            ['outstanding_amount' => $amount],
            ['outstanding_amount' => 0],
            'Дутуу тооцоо устгав: '.($entry->patient_name ?? '—').' — '.number_format($amount).'₮ ('
                .($entry->dailySheet->branch?->name ?? '—').', '.$entry->dailySheet->date->toDateString().')'
                .($reason !== '' ? ' · Шалтгаан: '.$reason : ''),
        );

        return back()->with('success', 'Дутуу тооцоо устгагдлаа.');
    }

    /**
     * Илүү тооцооны дүнг засах. Аль хэдийн ашигласан дүнгээс бага болгохыг хориглоно
     * (эсрэг тохиолдолд ашиглалт нь эх үүсвэрээсээ давчихна).
     */
    public function updateOverpaid(Request $request, DailySheetEntry $entry): RedirectResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'amount' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validated['code'] !== $this->dailySheetCode()) {
            return back()->withErrors(['code' => 'Код буруу байна.']);
        }

        $old = (int) $entry->overpaid_amount;
        $new = (int) $validated['amount'];

        if ($old <= 0) {
            return back()->withErrors(['code' => 'Энэ бичлэгт илүү тооцоо алга байна.']);
        }

        $used = (int) OverpaidUsage::where('source_entry_id', $entry->id)->sum('amount');

        if ($new < $used) {
            return back()->withErrors([
                'amount' => 'Ашигласан дүн ('.number_format($used).'₮)-ээс бага болгох боломжгүй.',
            ]);
        }

        if ($new === $old) {
            return back()->with('info', 'Дүн өөрчлөгдсөнгүй.');
        }

        $entry->update(['overpaid_amount' => $new]);
        $this->syncOverpaidUsedFlags($entry);

        $entry->loadMissing('dailySheet.branch');

        $reason = trim($validated['reason'] ?? '');
        AuditService::log(
            'updated',
            $entry,
            ['overpaid_amount' => $old],
            ['overpaid_amount' => $new],
            'Илүү тооцоо зассан: '.($entry->patient_name ?? '—').' — '
                .number_format($old).'₮ → '.number_format($new).'₮ ('
                .($entry->dailySheet?->branch?->name ?? '—').', '.($entry->dailySheet?->date?->toDateString() ?? '—').')'
                .($reason !== '' ? ' · Шалтгаан: '.$reason : ''),
        );

        return back()->with('success', 'Илүү тооцоо зассан.');
    }

    /**
     * Илүү тооцоог устгах — мөрийг биш, зөвхөн илүү дүнг тэглэнэ.
     * Ашиглалттай бол эхлээд ашиглалтын бичлэгүүдийг устгах шаардлагатай.
     */
    public function destroyOverpaid(Request $request, DailySheetEntry $entry): RedirectResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validated['code'] !== $this->dailySheetCode()) {
            return back()->withErrors(['code' => 'Код буруу байна.']);
        }

        $amount = (int) $entry->overpaid_amount;

        if ($amount <= 0) {
            return back()->with('info', 'Энэ бичлэгт илүү тооцоо алга байна.');
        }

        $used = (int) OverpaidUsage::where('source_entry_id', $entry->id)->sum('amount');

        if ($used > 0) {
            return back()->withErrors([
                'code' => 'Ашиглалттай илүү тооцоог устгах боломжгүй. Эхлээд ашиглалтын бичлэгүүдийг устгана уу.',
            ]);
        }

        $entry->update([
            'overpaid_amount' => 0,
            'overpaid_used_at' => null,
            'overpaid_used_receipt' => null,
            'overpaid_used_method' => null,
            'overpaid_used_amount' => null,
        ]);

        $entry->loadMissing('dailySheet.branch');

        $reason = trim($validated['reason'] ?? '');
        AuditService::log(
            'deleted',
            $entry,
            ['overpaid_amount' => $amount],
            ['overpaid_amount' => 0],
            'Илүү тооцоо устгав: '.($entry->patient_name ?? '—').' — '.number_format($amount).'₮ ('
                .($entry->dailySheet?->branch?->name ?? '—').', '.($entry->dailySheet?->date?->toDateString() ?? '—').')'
                .($reason !== '' ? ' · Шалтгаан: '.$reason : ''),
        );

        return back()->with('success', 'Илүү тооцоо устгагдлаа.');
    }

    /**
     * Хэсэгчилсэн ашиглалтыг устгах — тухайн дүн эх үүсвэрийн үлдэгдэл рүү буцна.
     * Ашигласан өдрийн тооцоонд уг мөр кредитээр хаагдсан бол дахин дутуу болно.
     */
    public function destroyOverpaidUsage(Request $request, OverpaidUsage $usage): RedirectResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validated['code'] !== $this->dailySheetCode()) {
            return back()->withErrors(['code' => 'Код буруу байна.']);
        }

        $entry = $usage->sourceEntry()->withTrashed()->first();
        $entry?->loadMissing('dailySheet.branch');

        $amount = (int) $usage->amount;
        $receipt = $usage->target_receipt;
        $targetDate = $usage->target_date?->toDateString();

        $usage->delete();

        if ($entry) {
            $this->syncOverpaidUsedFlags($entry);

            $branchId = $entry->dailySheet?->branch_id;
            // Эх өдөр (үлдэгдэл нэмэгдэнэ) ба ашигласан өдөр (кредит хасагдана) хоёуланг сэргээнэ
            DailySheetUpdated::mark($branchId, $entry->dailySheet?->date);
            DailySheetUpdated::mark($branchId, $targetDate);
        }

        $reason = trim($validated['reason'] ?? '');
        AuditService::log(
            'deleted',
            $entry,
            ['usage_receipt' => $receipt, 'amount' => $amount, 'target_date' => $targetDate],
            null,
            'Илүү тооцооны ашиглалт устгав: '.($entry?->patient_name ?? '—').' — '.number_format($amount).'₮ · баримт '
                .($receipt ?: '—').' ('.($targetDate ?? '—').')'
                .($reason !== '' ? ' · Шалтгаан: '.$reason : ''),
        );

        return back()->with('success', 'Ашиглалт устгагдлаа. Дүн үлдэгдэл рүү буцлаа.');
    }

    /**
     * Ашиглалт/дүн өөрчлөгдсөний дараа эх мөрийн overpaid_used_* хураангуйг
     * дахин тааруулна (зөвхөн бүрэн ашиглагдсан үед дүүргэнэ).
     */
    private function syncOverpaidUsedFlags(DailySheetEntry $entry): void
    {
        $usages = OverpaidUsage::where('source_entry_id', $entry->id)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $used = (int) $usages->sum('amount');
        $last = $usages->last();

        if ($last === null || $used < (int) $entry->overpaid_amount) {
            $entry->update([
                'overpaid_used_at' => null,
                'overpaid_used_receipt' => null,
                'overpaid_used_method' => null,
                'overpaid_used_amount' => null,
            ]);

            return;
        }

        $entry->update([
            'overpaid_used_at' => $last->created_at,
            'overpaid_used_receipt' => $last->target_receipt,
            'overpaid_used_method' => $last->method,
            'overpaid_used_amount' => $used,
        ]);
    }

    /** Өдрийн тооцооны хамгаалалтын код */
    private function dailySheetCode(): string
    {
        return (string) (Setting::where('key', 'daily_sheet_code')->value('value') ?? '1234');
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

        // Шатлалтай нээлт: өдөр → өглөө
        if ($sheet->submitted_at !== null) {
            // 1-р шат: өдрийн баталгаажуулалт тайлна, өглөөних хэвээр хадгална
            $sheet->update([
                'submitted_at' => null,
                'receptionist_id' => null,
            ]);

            return back()->with('success', 'Өдрийн баталгаажуулалт тайлагдлаа. Өглөөний мөрүүд хэвээр байна.');
        }

        // 2-р шат: өглөөний баталгаажуулалт тайлна
        $sheet->update([
            'morning_submitted_at' => null,
            'morning_receptionist_id' => null,
        ]);

        $sheet->entries()->update(['is_morning_entry' => false]);

        return back()->with('success', 'Өглөөний баталгаажуулалт тайлагдлаа. Бүх мөрүүд засварлагдах боломжтой болов.');
    }

    public function exportExcel(Request $request): BinaryFileResponse
    {
        $mode = $request->get('mode', 'day');
        $date = $request->get('date', now()->toDateString());
        $month = $request->get('month', now()->format('Y-m'));
        $doctorId = $request->get('doctorId');
        $branchId = $request->get('branchId');

        [$year, $mon] = explode('-', $month);

        $sheets = DailySheet::with(['branch', 'entries.doctor', 'entries.user'])
            ->when($mode === 'month',
                fn ($q) => $q->whereYear('date', $year)->whereMonth('date', $mon),
                fn ($q) => $q->whereDate('date', $date)
            )
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->orderBy('date')
            ->orderBy('branch_id')
            ->get();

        $filename = $mode === 'month' ? "daily-sheets-{$month}.xlsx" : "daily-sheets-{$date}.xlsx";

        return Excel::download(new DailySheetExport($sheets, $doctorId), $filename);
    }

    private function mapSheet(DailySheet $sheet, ?string $doctorId): array
    {
        $entries = $sheet->entries;

        if ($doctorId) {
            $entries = $entries->filter(fn ($e) => $e->doctor_id == $doctorId)->values();
        }

        // Энэ өдрийн мөрүүдэд орсон илүү тооцооны кредит — тухайн мөр кредитээр
        // хаагдсаныг админ талд харуулахын тулд (баримтын дугаар давтагддаг тул
        // зөвхөн энэ өдөр, энэ салбарынхыг авна)
        $apptNumbers = $entries->pluck('appointment_number')->filter()->unique()->values()->all();
        $creditsByReceipt = empty($apptNumbers)
            ? collect()
            : OverpaidUsage::whereIn('target_receipt', $apptNumbers)
                ->whereDate('target_date', $sheet->date)
                ->whereHas('sourceEntry', fn ($sq) => $sq->withTrashed()
                    ->whereHas('dailySheet', fn ($dq) => $dq->withTrashed()->where('branch_id', $sheet->branch_id)))
                ->with('sourceEntry.dailySheet')
                ->get()
                ->groupBy('target_receipt');

        // Илүү тооцоогоор хаагдсан мөр "дутуу" болж тоологдохгүйн тулд
        // ресепшний дэлгэцтэй ижилхэн кредитийг оруулж бодно (DB-д бичихгүй)
        $outstandingOf = function ($e) use ($creditsByReceipt) {
            if ((int) $e->gross_amount <= 0) {
                return (int) $e->outstanding_amount;
            }

            $credit = $e->appointment_number
                ? (int) collect($creditsByReceipt->get($e->appointment_number, []))->sum('amount')
                : 0;

            $paid = (int) $e->mobile_amount + (int) $e->card_amount
                + (int) $e->cash_amount + (int) $e->storepay_amount + $credit;

            return max(0, (int) $e->total_amount - $paid);
        };

        $totals = [
            'total_amount' => $entries->sum('total_amount'),
            'discount' => $entries->sum(fn ($e) => (int) round($e->gross_amount * $e->discount / 100)),
            'mobile_amount' => $entries->sum('mobile_amount'),
            'card_amount' => $entries->sum('card_amount'),
            'cash_amount' => $entries->sum('cash_amount'),
            'storepay_amount' => $entries->sum('storepay_amount'),
            'outstanding_amount' => $entries->sum($outstandingOf),
        ];

        return [
            'id' => $sheet->id,
            'date' => $sheet->date->toDateString(),
            'branch' => $sheet->branch?->name,
            'branch_id' => $sheet->branch_id,
            'is_confirmed' => $sheet->submitted_at !== null,
            'submitted_at' => $sheet->submitted_at?->toDateTimeString(),
            'receptionist' => $sheet->receptionist?->name,
            'morning_confirmed' => $sheet->morning_submitted_at !== null,
            'morning_submitted_at' => $sheet->morning_submitted_at?->toDateTimeString(),
            'morning_receptionist' => $sheet->morningReceptionist?->name,
            'totals' => $totals,
            'entries' => $entries->map(fn ($e) => [
                'id' => $e->id,
                'applied_credits' => $e->appointment_number
                    ? collect($creditsByReceipt->get($e->appointment_number, []))
                        ->map(fn ($u) => [
                            'amount' => (int) $u->amount,
                            'method' => $u->method,
                            'from_date' => $u->sourceEntry?->dailySheet?->date?->toDateString(),
                            'from_name' => $u->sourceEntry?->patient_name,
                        ])->values()->all()
                    : [],
                'patient_name' => $e->patient_name,
                'gender' => $e->gender,
                'diagnosis' => $e->diagnosis,
                'appointment_number' => $e->appointment_number,
                'gross_amount' => $e->gross_amount,
                'discount' => $e->discount,
                'mobile_amount' => $e->mobile_amount,
                'card_amount' => $e->card_amount,
                'cash_amount' => $e->cash_amount,
                'storepay_amount' => $e->storepay_amount,
                'total_amount' => $e->total_amount,
                'outstanding_amount' => $e->outstanding_amount,
                'doctor_id' => $e->doctor_id,
                'doctor_name' => $e->doctor?->name,
                'technician_employee_id' => $e->technician_employee_id,
                'technician_name' => $e->technician_employee_id
                    ? (function ($emp) {
                        if (! $emp) {
                            return null;
                        }
                        $last = preg_match('/^[\-—\s]+$/', trim((string) $emp->last_name)) ? '' : trim((string) $emp->last_name);
                        return trim($last.' '.$emp->first_name) ?: null;
                    })(\DB::table('employees')->where('id', $e->technician_employee_id)->first(['first_name', 'last_name']))
                    : null,
                'receptionist_name' => $e->user?->name,
                'supply_orthodontic_brush' => (int) $e->supply_orthodontic_brush,
                'supply_interdental_brush' => (int) $e->supply_interdental_brush,
                'supply_dental_floss' => (int) $e->supply_dental_floss,
                'supply_wax' => (int) $e->supply_wax,
                'supply_retainer_case' => (int) $e->supply_retainer_case,
                'supply_removable_app_case' => (int) $e->supply_removable_app_case,
                'entry_notes' => $e->entry_notes,
                'is_morning_entry' => (bool) $e->is_morning_entry,
                'overpaid_amount' => (int) $e->overpaid_amount,
                'overpaid_used_at' => $e->overpaid_used_at?->toDateTimeString(),
            ])->values()->all(),
        ];
    }
}
