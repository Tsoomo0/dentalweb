<?php

namespace App\Http\Controllers\HR;

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
use Inertia\Inertia;
use Inertia\Response;

class ReceptionBonusController extends Controller
{
    public function index(): Response
    {
        $runs = ReceptionBonusRun::withCount('entries')
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

        return Inertia::render('hr/reception-bonus/index', [
            'runs' => $runs,
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
            Employee::with('position')
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->where('branch_id', $request->branch_id)
                ->whereHas('position', fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', ['%ресепш%']))
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

    public function exportExcel(ReceptionBonusRun $receptionBonusRun): \Illuminate\Http\Response
    {
        $receptionBonusRun->load(['entries.employee.position']);
        $entries = $receptionBonusRun->entries->map(fn ($e) => $this->formatEntry($e));
        $criteria = ReceptionBonusEntry::CRITERIA;

        $filename = 'reception-bonus-'.$receptionBonusRun->year.'-'.$receptionBonusRun->month.'-'.$receptionBonusRun->half.'.xls';

        return response(
            view('hr.reception-bonus-excel', compact('receptionBonusRun', 'entries', 'criteria'))->render(),
            200,
            [
                'Content-Type' => 'application/vnd.ms-excel',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]
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
