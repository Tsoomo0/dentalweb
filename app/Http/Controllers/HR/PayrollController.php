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
use App\Support\Payroll\PayrollSchema;
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
                // Гар оролтыг өгөөд томьёотой баганыг схемээр бодуулна
                $computed = PayrollSchema::compute([
                    'basic_salary' => $emp->salary ?? 0,
                    'working_days' => 11,
                    'worked_days' => 11,
                ], $run->half);

                PayrollEntry::create(array_merge(
                    ['payroll_run_id' => $run->id, 'employee_id' => $emp->id],
                    array_intersect_key($computed, array_flip(PayrollSchema::storedKeys($run->half)))
                ));
            }

            return $run;
        });

        return redirect()->route('hr.payroll.show', $run)
            ->with('success', 'Цалингийн тооцоо үүсгэгдлээ.');
    }

    public function show(PayrollRun $payrollRun): Response
    {
        $payrollRun->load(['entries.employee.position', 'entries.employee.branch']);

        $entries = $payrollRun->entries->map(fn ($e) => $this->formatEntry($e, $payrollRun->half));

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
            // Хүснэгтийн бүтэц болон томьёог сервер тал дамжуулна —
            // эхэн/сүүл цалингийн ялгаа бүхэлдээ PayrollSchema дотор байрлана
            'columns' => PayrollSchema::columns($payrollRun->half),
            'groups' => PayrollSchema::groups($payrollRun->half),
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

        $this->saveEntries($request->entries, $payrollRun);

        return back()->with('success', 'Цалингийн мэдээлэл хадгалагдлаа.');
    }

    public function finalize(Request $request, PayrollRun $payrollRun): RedirectResponse
    {
        if ($request->has('entries') && is_array($request->entries)) {
            $this->saveEntries($request->entries, $payrollRun);
        }

        $payrollRun->update(['status' => 'final']);

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
            new PayrollTemplateExport($payrollRun->entries, $payrollRun->half),
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

        // Багана байрлал → талбар.  A=id, B=нэр, C=дугаар тул өгөгдөл D (индекс 3)-аас эхэлнэ.
        // Зөвхөн ГАР ОРОЛТЫГ уншина — томьёотой баганыг сервер дээр дахин бодох тул
        // Excel дээр томьёог нь эвдсэн ч тооцоо буруу орохгүй.
        $map = [];
        foreach (PayrollSchema::columns($payrollRun->half) as $i => $col) {
            if ($col['formula'] === null) {
                $map[$i + 3] = $col['key'];
            }
        }

        $entries = [];

        foreach ($rows as $row) {
            $id = (int) ($row[0] ?? 0); // header мөр (id='id') энд 0 болж алгасагдана
            if (! $id) {
                continue;
            }

            $data = ['id' => $id];
            foreach ($map as $col => $field) {
                $raw = isset($row[$col]) ? trim(str_replace(',', '', (string) $row[$col])) : '';
                $data[$field] = $raw !== '' ? (float) $raw : 0;
            }

            $entries[] = $data;
        }

        if (! $entries) {
            return back()->with('error', 'Файлаас нэг ч мөр уншигдсангүй. Template-ээ шалгана уу.');
        }

        $this->saveEntries($entries, $payrollRun);

        return back()->with('success', count($entries).' мөр import хийгдлээ.');
    }

    public function exportExcel(PayrollRun $payrollRun): BinaryFileResponse
    {
        $payrollRun->load(['entries.employee.position', 'entries.employee.branch']);
        $entries = $payrollRun->entries->map(fn ($e) => $this->formatEntry($e, $payrollRun->half));

        return Excel::download(new PayrollExport($entries, $payrollRun->half), $payrollRun->title.'.xlsx');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Мөрүүдийг хадгална.  Гар оролтыг л хүлээж авч, томьёотой баганыг
     * сервер дээр PayrollSchema-аар дахин бодно — ингэснээр хөтчөөс ирсэн
     * эсвэл Excel-ээс уншсан дүн томьёотой хэзээ ч зөрөхгүй.
     *
     * @param  array<int, array<string, mixed>>  $entries
     */
    private function saveEntries(array $entries, PayrollRun $run): void
    {
        $inputKeys = PayrollSchema::inputKeys($run->half);
        $storedKeys = PayrollSchema::storedKeys($run->half);

        DB::transaction(function () use ($entries, $run, $inputKeys, $storedKeys) {
            foreach ($entries as $data) {
                if (empty($data['id'])) {
                    continue;
                }

                $input = [];
                foreach ($inputKeys as $key) {
                    $input[$key] = isset($data[$key]) && $data[$key] !== '' ? (float) $data[$key] : 0;
                }

                $computed = PayrollSchema::compute($input, $run->half);

                PayrollEntry::where('id', $data['id'])
                    ->where('payroll_run_id', $run->id)
                    ->update(array_intersect_key($computed, array_flip($storedKeys)));
            }
        });
    }

    private function formatEntry(PayrollEntry $e, string $half): array
    {
        return array_merge(
            PayrollSchema::compute($e->toArray(), $half),
            [
                'id' => $e->id,
                'employee_id' => $e->employee_id,
                'name' => $e->employee->full_name,
                'employee_number' => $e->employee->employee_number,
                'register_number' => $e->employee->register_number,
                'position' => $e->employee->position?->name,
                'bank_account' => $e->employee->bank_account,
                'is_sent' => (bool) $e->is_sent,
            ]
        );
    }
}
