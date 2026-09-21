<?php

namespace App\Http\Controllers\HR;

use App\Exports\ReceptionBonusExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\ReceptionBonusEntry;
use App\Models\HR\ReceptionBonusRun;
use App\Notifications\ReceptionBonusSent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Inertia\Inertia;
use Inertia\Response;

class ReceptionBonusController extends Controller
{
    /** Нэг хуудсанд харуулах тооцооны тоо. */
    private const PER_PAGE = 10;

    public function index(Request $request): Response
    {
        $filters = [
            // '' | draft | sending | final
            'state' => $request->string('state')->toString(),
            'year' => $request->string('year')->toString(),
            'branch' => $request->string('branch')->toString(),
            'half' => $request->string('half')->toString(),
            'search' => $request->string('search')->toString(),
        ];

        $query = ReceptionBonusRun::query()
            ->when($filters['state'] === 'final', fn ($q) => $q->where('status', 'final'))
            ->when($filters['state'] === 'draft', fn ($q) => $q
                ->where('status', 'draft')
                ->whereDoesntHave('entries', fn ($e) => $e->where('is_sent', true)))
            ->when($filters['state'] === 'sending', fn ($q) => $q
                ->where('status', 'draft')
                ->whereHas('entries', fn ($e) => $e->where('is_sent', true)))
            ->when($filters['year'], fn ($q, $v) => $q->where('year', (int) $v))
            ->when($filters['branch'], fn ($q, $v) => $q->where('branch_id', (int) $v))
            ->when($filters['half'], fn ($q, $v) => $q->where('half', $v))
            ->when($filters['search'], fn ($q, $v) => $q->where(fn ($q) => $q
                ->where('label', 'like', "%{$v}%")
                ->orWhere('notes', 'like', "%{$v}%")
                ->orWhere('year', 'like', "%{$v}%")
                ->orWhereHas('creator', fn ($c) => $c->where('name', 'like', "%{$v}%"))))
            ->latest();

        $runs = (clone $query)
            ->withCount('entries')
            ->withCount(['entries as sent_entries_count' => fn ($q) => $q->where('is_sent', true)])
            // Жагсаалт дээр тухайн тооцооны нийт урамшууллын дүнг харуулна
            ->withSum('entries as total_bonus', 'total_amount')
            ->with('creator')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (ReceptionBonusRun $r) => [
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
                'total_bonus' => (float) ($r->total_bonus ?? 0),
                'created_at' => $r->created_at->format('Y.m.d'),
                'created_by' => $r->creator?->name,
            ]);

        return Inertia::render('hr/reception-bonus/index', [
            'runs' => $runs,
            'filters' => $filters,
            'stats' => $this->stats(),
            // Шүүсэн БҮХ тооцооны (зөвхөн энэ хуудсынх биш) урамшууллын дүн
            'totalBonus' => (float) ReceptionBonusEntry::whereIn('bonus_run_id', (clone $query)->reorder()->select('reception_bonus_runs.id'))
                ->sum('total_amount'),
            'branches' => fn () => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Түргэн шүүлтүүрийн хажууд харагдах төлөв бүрийн тоо.
     *
     * @return array<string, int>
     */
    private function stats(): array
    {
        $final = ReceptionBonusRun::where('status', 'final')->count();
        $sending = ReceptionBonusRun::where('status', 'draft')
            ->whereHas('entries', fn ($e) => $e->where('is_sent', true))
            ->count();
        $total = ReceptionBonusRun::count();

        return [
            'total' => $total,
            'final' => $final,
            'sending' => $sending,
            'draft' => $total - $final - $sending,
        ];
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

            $run = ReceptionBonusRun::create([
                'year' => $request->year,
                'month' => $request->month,
                'half' => $request->half,
                'label' => $branch->name,
                'branch_id' => $request->branch_id,
                'notes' => $request->notes,
                'status' => 'draft',
                'created_by' => Auth::id(),
            ]);

            // Тухайн салбарын ресепшн ажилтнуудаар entry үүсгэх
            // - Үндсэн position нь "ресепш" агуулсан, ЭСВЭЛ
            // - extra_portals дотор 'reception' (сувилагч мөн ресепшний ажил хийдэг гэх мэт)
            Employee::with('position')
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->where('branch_id', $request->branch_id)
                ->where(function ($q) {
                    $q->whereHas('position', fn ($q2) => $q2->whereRaw('LOWER(name) LIKE ?', ['%ресепш%']))
                      ->orWhereJsonContains('extra_portals', 'reception');
                })
                ->orderBy('last_name')
                ->get()
                ->each(fn ($emp) => ReceptionBonusEntry::create([
                    'bonus_run_id' => $run->id,
                    'employee_id' => $emp->id,
                ]));

            return $run;
        });

        return redirect()->route('hr.reception-bonus.show', $run)
            ->with('success', 'Урамшууллын тооцоо үүсгэгдлээ.');
    }

    public function show(ReceptionBonusRun $receptionBonusRun): Response
    {
        $receptionBonusRun->load(['entries.employee.position']);

        $entries = $receptionBonusRun->entries->map(fn ($e) => $this->formatEntry($e));

        return Inertia::render('hr/reception-bonus/show', [
            'run' => [
                'id' => $receptionBonusRun->id,
                'title' => $receptionBonusRun->title,
                'year' => $receptionBonusRun->year,
                'month' => $receptionBonusRun->month,
                'half' => $receptionBonusRun->half,
                'half_label' => $receptionBonusRun->half_label,
                'label' => $receptionBonusRun->label,
                'status' => $receptionBonusRun->status,
                'notes' => $receptionBonusRun->notes,
            ],
            'entries' => $entries,
            'criteria' => ReceptionBonusEntry::CRITERIA,
        ]);
    }

    public function update(Request $request, ReceptionBonusRun $receptionBonusRun): RedirectResponse
    {
        if ($receptionBonusRun->status === 'final') {
            return back()->with('error', 'Баталгаажсан тооцоог засах боломжгүй.');
        }

        $request->validate([
            'entries' => 'required|array',
            'entries.*.id' => 'required|exists:reception_bonus_entries,id',
        ]);

        $fields = ['registrations', 'calls_received', 'call_reminders', 'complaints', 'compliments', 'hubspot_regs', 'payments', 'total_amount'];

        DB::transaction(function () use ($request, $fields, $receptionBonusRun) {
            foreach ($request->entries as $data) {
                $update = [];
                foreach ($fields as $f) {
                    $update[$f] = isset($data[$f]) && $data[$f] !== '' ? (float) $data[$f] : 0;
                }
                ReceptionBonusEntry::where('id', $data['id'])
                    ->where('bonus_run_id', $receptionBonusRun->id)
                    ->update($update);
            }
        });

        return back()->with('success', 'Урамшуулал хадгалагдлаа.');
    }

    public function finalize(Request $request, ReceptionBonusRun $receptionBonusRun): RedirectResponse
    {
        $fields = ['registrations', 'calls_received', 'call_reminders', 'complaints', 'compliments', 'hubspot_regs', 'payments', 'total_amount'];

        DB::transaction(function () use ($request, $fields, $receptionBonusRun) {
            // Save current entry values first (if provided)
            if ($request->has('entries') && is_array($request->entries)) {
                foreach ($request->entries as $data) {
                    if (empty($data['id'])) {
                        continue;
                    }
                    $update = [];
                    foreach ($fields as $f) {
                        $update[$f] = isset($data[$f]) && $data[$f] !== '' ? (float) $data[$f] : 0;
                    }
                    ReceptionBonusEntry::where('id', $data['id'])
                        ->where('bonus_run_id', $receptionBonusRun->id)
                        ->update($update);
                }
            }

            $receptionBonusRun->update(['status' => 'final']);
        });

        $receptionBonusRun->load('entries.employee.user', 'entries.run');
        foreach ($receptionBonusRun->entries as $entry) {
            $user = $entry->employee?->user;
            if (! $user) {
                continue;
            }

            $entry->update(['is_sent' => true, 'sent_at' => now()]);
            try {
                $user->notify(new ReceptionBonusSent($entry));
            } catch (\Throwable $e) {
                \Log::warning("ReceptionBonusSent mail failed for user {$user->id}: ".$e->getMessage());
            }
        }

        return back()->with('success', 'Урамшуулал баталгаажлаа. Бүх ажилтанд мэдэгдэл илгээлээ.');
    }

    public function sendEntry(ReceptionBonusRun $receptionBonusRun, ReceptionBonusEntry $entry): RedirectResponse
    {
        if ($entry->bonus_run_id !== $receptionBonusRun->id) {
            return back()->with('error', 'Алдаатай хүсэлт.');
        }

        $entry->load('employee.user', 'run');
        $user = $entry->employee?->user;

        if (! $user) {
            return back()->with('error', 'Ажилтны системийн хэрэглэгч олдсонгүй.');
        }

        $entry->update(['is_sent' => true, 'sent_at' => now()]);
        try {
            $user->notify(new ReceptionBonusSent($entry));
        } catch (\Throwable $e) {
            \Log::warning("ReceptionBonusSent mail failed for user {$user->id}: ".$e->getMessage());
        }

        return back()->with('success', "{$entry->employee->full_name} ажилтанд урамшуулал илгээлээ.");
    }

    public function reopen(ReceptionBonusRun $receptionBonusRun): RedirectResponse
    {
        $receptionBonusRun->update(['status' => 'draft']);

        return back()->with('success', 'Урамшуулал нээгдлээ.');
    }

    public function exportExcel(ReceptionBonusRun $receptionBonusRun): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $receptionBonusRun->load(['entries.employee.position']);
        $entries = $receptionBonusRun->entries->map(fn ($e) => $this->formatEntry($e));
        $criteria = ReceptionBonusEntry::CRITERIA;

        return Excel::download(
            new ReceptionBonusExport($entries, $criteria, $receptionBonusRun),
            'reception-bonus-'.$receptionBonusRun->year.'-'.$receptionBonusRun->month.'-'.$receptionBonusRun->half.'.xlsx'
        );
    }

    public function destroy(ReceptionBonusRun $receptionBonusRun): RedirectResponse
    {
        $receptionBonusRun->delete();

        return redirect()->route('hr.reception-bonus.index')->with('success', 'Устгагдлаа.');
    }

    private function formatEntry(ReceptionBonusEntry $e): array
    {
        return [
            'id' => $e->id,
            'employee_id' => $e->employee_id,
            'name' => $e->employee->full_name,
            'employee_number' => $e->employee->employee_number,
            'position' => $e->employee->position?->name,
            'registrations' => $e->registrations,
            'calls_received' => $e->calls_received,
            'call_reminders' => $e->call_reminders,
            'complaints' => $e->complaints,
            'compliments' => $e->compliments,
            'hubspot_regs' => $e->hubspot_regs,
            'payments' => $e->payments,
            'total_amount' => $e->total_amount,
            'is_sent' => (bool) $e->is_sent,
        ];
    }
}
