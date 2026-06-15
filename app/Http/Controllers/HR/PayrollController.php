<?php

namespace App\Http\Controllers\HR;

use App\Exports\PayrollExport;
use App\Exports\PayrollTemplateExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\PayrollEntry;
use App\Models\HR\PayrollRun;
use App\Notifications\PayrollSlipSent;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PayrollController extends Controller
{
    public function index(): Response
    {
        $runs = PayrollRun::withCount('entries')
            ->withCount(['entries as sent_entries_count' => fn ($q) => $q->where('is_sent', true)])
            ->with('creator')
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'title' => $r->title,
                'year' => $r->year,
                'month' => $r->month,
                'half' => $r->half,
                'half_label' => $r->half_label,
                'label' => $r->label,
                'status' => $r->status,
                'entries_count' => $r->entries_count,
                'sent_entries_count' => $r->sent_entries_count,
                'created_at' => $r->created_at->format('Y.m.d'),
                'created_by' => $r->creator?->name,
            ]);

        return Inertia::render('hr/payroll/index', [
            'runs' => $runs,
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('hr/payroll/create', [
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'half' => 'required|in:first,second',
            'branch_id' => 'required|exists:branches,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $run = DB::transaction(function () use ($request) {
            $branch = Branch::findOrFail($request->branch_id);

            $run = PayrollRun::create([
                'year' => $request->year,
                'month' => $request->month,
                'half' => $request->half,
                'label' => $branch->name,
                'notes' => $request->notes,
                'status' => 'draft',
                'created_by' => Auth::id(),
                'branch_id' => $request->branch_id,
            ]);

            // Тухайн салбарын идэвхтэй ажилтнуудаар entry үүсгэх
            $employees = Employee::with('position')
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->where('branch_id', $request->branch_id)
                ->orderBy('last_name')
                ->get();

            foreach ($employees as $emp) {
                PayrollEntry::create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $emp->id,
                    'basic_salary' => $emp->salary ?? 0,
                    'nd_salary' => $emp->salary ?? 0,
                    'working_days' => $request->half === 'first' ? 11 : 11,
                    'worked_days' => $request->half === 'first' ? 11 : 11,
                ]);
            }

            return $run;
        });

        return redirect()->route('hr.payroll.show', $run)
            ->with('success', 'Цалингийн тооцоо үүсгэгдлээ.');
    }

    public function show(PayrollRun $payrollRun): Response
    {
        $payrollRun->load(['entries.employee.position', 'entries.employee.branch']);

        $entries = $payrollRun->entries->map(fn ($e) => $this->formatEntry($e));

        return Inertia::render('hr/payroll/show', [
            'run' => [
                'id' => $payrollRun->id,
                'title' => $payrollRun->title,
                'year' => $payrollRun->year,
                'month' => $payrollRun->month,
                'half' => $payrollRun->half,
                'half_label' => $payrollRun->half_label,
                'label' => $payrollRun->label,
                'status' => $payrollRun->status,
                'notes' => $payrollRun->notes,
            ],
            'entries' => $entries,
        ]);
    }

    public function update(Request $request, PayrollRun $payrollRun): RedirectResponse
    {
        if ($payrollRun->status === 'final') {
            return back()->with('error', 'Баталгаажсан тооцоог засах боломжгүй.');
        }

        $request->validate([
            'entries' => 'required|array',
            'entries.*.id' => 'required|exists:payroll_entries,id',
        ]);

        $fields = [
            'basic_salary', 'nd_salary', 'prev_paid', 'holiday_advance',
            'ath_bonus', 'overtime_bonus', 'vacation_pay',
            'working_days', 'worked_days', 'daily_rate',
            'food', 'transport', 'milk',
            'total_bonus', 'calc_salary', 'nd_total', 'ndsh',
            'tardiness', 'no_fingerprint', 'other_deduction',
            'income_tax', 'net_hand', 'bank_salary',
        ];

        DB::transaction(function () use ($request, $fields) {
            foreach ($request->entries as $data) {
                $update = [];
                foreach ($fields as $f) {
                    $update[$f] = isset($data[$f]) && $data[$f] !== '' ? (float) $data[$f] : 0;
                }
                PayrollEntry::where('id', $data['id'])->update($update);
            }
        });

        return back()->with('success', 'Цалингийн мэдээлэл хадгалагдлаа.');
    }

    public function finalize(Request $request, PayrollRun $payrollRun): RedirectResponse
    {
        $saveFields = [
            'basic_salary', 'nd_salary', 'prev_paid', 'holiday_advance',
            'ath_bonus', 'overtime_bonus', 'vacation_pay',
            'working_days', 'worked_days', 'daily_rate',
            'food', 'transport', 'milk',
            'total_bonus', 'calc_salary', 'nd_total', 'ndsh',
            'tardiness', 'no_fingerprint', 'other_deduction',
            'income_tax', 'net_hand', 'bank_salary',
        ];

        DB::transaction(function () use ($request, $saveFields, $payrollRun) {
            if ($request->has('entries') && is_array($request->entries)) {
                foreach ($request->entries as $data) {
                    if (empty($data['id'])) {
                        continue;
                    }
                    $update = [];
                    foreach ($saveFields as $f) {
                        $update[$f] = isset($data[$f]) && $data[$f] !== '' ? (float) $data[$f] : 0;
                    }
                    PayrollEntry::where('id', $data['id'])
                        ->where('payroll_run_id', $payrollRun->id)
                        ->update($update);
                }
            }

            $payrollRun->update(['status' => 'final']);
        });

        // Бүх ажилтанд notification явуулах
        $payrollRun->load('entries.employee.user', 'entries.run');
        foreach ($payrollRun->entries as $entry) {
            $user = $entry->employee?->user;
            if (! $user) {
                continue;
            }

            $entry->update(['is_sent' => true, 'sent_at' => now()]);
            try {
                $user->notify(new PayrollSlipSent($entry));
            } catch (\Throwable $e) {
                // Mail тохиргоо алдаатай байсан ч database notification хадгалагдсан байна
                \Log::warning("PayrollSlipSent mail failed for user {$user->id}: ".$e->getMessage());
            }
        }

        AuditService::log('finalized', $payrollRun, null, ['title' => $payrollRun->title ?? "Run #{$payrollRun->id}"],
            'Цалингийн тооцоо баталгаажуулав: '.($payrollRun->title ?? "#{$payrollRun->id}"));

        return back()->with('success', 'Цалингийн тооцоо баталгаажлаа. Бүх ажилтанд мэдэгдэл илгээлээ.');
    }

    public function sendEntry(PayrollRun $payrollRun, PayrollEntry $entry): RedirectResponse
    {
        if ($entry->payroll_run_id !== $payrollRun->id) {
            return back()->with('error', 'Алдаатай хүсэлт.');
        }

        $entry->load('employee.user', 'run');
        $user = $entry->employee?->user;

        if (! $user) {
            return back()->with('error', 'Ажилтны системийн хэрэглэгч олдсонгүй.');
        }

        $entry->update(['is_sent' => true, 'sent_at' => now()]);
        try {
            $user->notify(new PayrollSlipSent($entry));
        } catch (\Throwable $e) {
            \Log::warning("PayrollSlipSent mail failed for user {$user->id}: ".$e->getMessage());
        }

        return back()->with('success', "{$entry->employee->full_name} ажилтанд цалингийн задаргаа илгээлээ.");
    }

    public function reopen(PayrollRun $payrollRun): RedirectResponse
    {
        $payrollRun->update(['status' => 'draft']);

        return back()->with('success', 'Цалингийн тооцоо нээгдлээ.');
    }

    public function destroy(PayrollRun $payrollRun): RedirectResponse
    {
        $payrollRun->delete();

        return redirect()->route('hr.payroll.index')->with('success', 'Цалингийн тооцоо устгагдлаа.');
    }

    public function downloadTemplate(PayrollRun $payrollRun): BinaryFileResponse
    {
        $payrollRun->load('entries.employee');

        return Excel::download(
            new PayrollTemplateExport($payrollRun->entries),
            $payrollRun->title.'_template.xlsx'
        );
    }

    public function importCsv(Request $request, PayrollRun $payrollRun): RedirectResponse
    {
        if ($payrollRun->status === 'final') {
            return back()->with('error', 'Баталгаажсан тооцоог засах боломжгүй.');
        }

        $request->validate(['file' => 'required|file|mimes:xlsx,xls,csv,txt|max:5120']);

        // Excel (.xlsx/.xls) болон хуучин CSV-г бүгдийг дэмжинэ
        $rows = Excel::toArray(new class {}, $request->file('file'))[0] ?? [];

        // col index → db field
        $map = [
            3 => 'basic_salary',    4 => 'nd_salary',
            5 => 'prev_paid',       6 => 'holiday_advance',
            7 => 'ath_bonus',       8 => 'overtime_bonus',    9 => 'vacation_pay',
            10 => 'working_days',    11 => 'worked_days',       12 => 'daily_rate',
            13 => 'food',            14 => 'transport',         15 => 'milk',
            16 => 'total_bonus',     17 => 'calc_salary',       18 => 'nd_total',
            19 => 'ndsh',            20 => 'tardiness',         21 => 'no_fingerprint',
            22 => 'other_deduction', 23 => 'income_tax',        24 => 'net_hand',
            25 => 'bank_salary',
        ];

        DB::transaction(function () use ($rows, $map, $payrollRun) {
            foreach ($rows as $row) {
                $id = (int) ($row[0] ?? 0); // header мөр (id='id') энд 0 болж алгасагдана
                if (! $id) {
                    continue;
                }

                $update = [];
                foreach ($map as $col => $field) {
                    $raw = isset($row[$col]) ? trim(str_replace(',', '', (string) $row[$col])) : '';
                    $update[$field] = $raw !== '' ? (float) $raw : 0;
                }

                PayrollEntry::where('id', $id)
                    ->where('payroll_run_id', $payrollRun->id)
                    ->update($update);
            }
        });

        return back()->with('success', 'Import амжилттай боллоо.');
    }

    public function exportExcel(PayrollRun $payrollRun): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $payrollRun->load(['entries.employee.position', 'entries.employee.branch']);
        $entries = $payrollRun->entries->map(fn ($e) => $this->formatEntry($e));

        return Excel::download(new PayrollExport($entries), $payrollRun->title.'.xlsx');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function formatEntry(PayrollEntry $e): array
    {
        return [
            'id' => $e->id,
            'employee_id' => $e->employee_id,
            'name' => $e->employee->full_name,
            'employee_number' => $e->employee->employee_number,
            'register_number' => $e->employee->register_number,
            'position' => $e->employee->position?->name,
            'bank_account' => $e->employee->bank_account,
            'basic_salary' => $e->basic_salary,
            'nd_salary' => $e->nd_salary,
            'prev_paid' => $e->prev_paid,
            'holiday_advance' => $e->holiday_advance,
            'ath_bonus' => $e->ath_bonus,
            'overtime_bonus' => $e->overtime_bonus,
            'vacation_pay' => $e->vacation_pay,
            'working_days' => $e->working_days,
            'worked_days' => $e->worked_days,
            'daily_rate' => $e->daily_rate,
            'food' => $e->food,
            'transport' => $e->transport,
            'milk' => $e->milk,
            'total_bonus' => $e->total_bonus,
            'calc_salary' => $e->calc_salary,
            'nd_total' => $e->nd_total,
            'ndsh' => $e->ndsh,
            'tardiness' => $e->tardiness,
            'no_fingerprint' => $e->no_fingerprint,
            'other_deduction' => $e->other_deduction,
            'income_tax' => $e->income_tax ?? 0,
            'net_hand' => $e->net_hand,
            'bank_salary' => $e->bank_salary,
            'is_sent' => (bool) $e->is_sent,
        ];
    }
}
