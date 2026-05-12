<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\NurseBonusEntry;
use App\Models\HR\NurseBonusRun;
use App\Notifications\NurseBonusSent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class NurseBonusController extends Controller
{
    public function index(): Response
    {
        $runs = NurseBonusRun::withCount('entries')
            ->withCount(['entries as sent_entries_count' => fn($q) => $q->where('is_sent', true)])
            ->with('creator')
            ->latest()
            ->get()
            ->map(fn($r) => [
                'id'                 => $r->id,
                'title'              => $r->title,
                'year'               => $r->year,
                'month'              => $r->month,
                'half'               => $r->half,
                'half_label'         => $r->half_label,
                'label'              => $r->label,
                'status'             => $r->status,
                'entries_count'      => $r->entries_count,
                'sent_entries_count' => $r->sent_entries_count,
                'created_at'         => $r->created_at->format('Y.m.d'),
                'created_by'         => $r->creator?->name,
            ]);

        return Inertia::render('hr/nurse-bonus/index', [
            'runs'     => $runs,
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'year'      => 'required|integer|min:2020|max:2100',
            'month'     => 'required|integer|min:1|max:12',
            'half'      => 'required|in:first,second',
            'branch_id' => 'required|exists:branches,id',
            'notes'     => 'nullable|string|max:500',
        ]);

        $run = DB::transaction(function () use ($request) {
            $branch = Branch::findOrFail($request->branch_id);

            $run = NurseBonusRun::create([
                'year'       => $request->year,
                'month'      => $request->month,
                'half'       => $request->half,
                'label'      => $branch->name,
                'branch_id'  => $request->branch_id,
                'notes'      => $request->notes,
                'status'     => 'draft',
                'created_by' => Auth::id(),
            ]);

            // Тухайн салбарын сувилагч ажилтнуудаар entry үүсгэх
            Employee::with('position')
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->where('branch_id', $request->branch_id)
                ->whereHas('position', fn($q) => $q->whereRaw('LOWER(name) LIKE ?', ['%сувилагч%']))
                ->orderBy('last_name')
                ->get()
                ->each(fn($emp) => NurseBonusEntry::create([
                    'nurse_bonus_run_id' => $run->id,
                    'employee_id'        => $emp->id,
                ]));

            return $run;
        });

        return redirect()->route('hr.nurse-bonus.show', $run)
            ->with('success', 'Урамшууллын тооцоо үүсгэгдлээ.');
    }

    public function show(NurseBonusRun $nurseBonusRun): Response
    {
        $nurseBonusRun->load(['entries.employee.position']);

        $entries = $nurseBonusRun->entries->map(fn($e) => $this->formatEntry($e));

        return Inertia::render('hr/nurse-bonus/show', [
            'run'      => [
                'id'         => $nurseBonusRun->id,
                'title'      => $nurseBonusRun->title,
                'year'       => $nurseBonusRun->year,
                'month'      => $nurseBonusRun->month,
                'half'       => $nurseBonusRun->half,
                'half_label' => $nurseBonusRun->half_label,
                'label'      => $nurseBonusRun->label,
                'status'     => $nurseBonusRun->status,
                'notes'      => $nurseBonusRun->notes,
            ],
            'entries'  => $entries,
            'criteria' => NurseBonusEntry::CRITERIA,
        ]);
    }

    public function update(Request $request, NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        if ($nurseBonusRun->status === 'final') {
            return back()->with('error', 'Баталгаажсан тооцоог засах боломжгүй.');
        }

        $request->validate([
            'entries'      => 'required|array',
            'entries.*.id' => 'required|exists:nurse_bonus_entries,id',
        ]);

        $fields = [
            'clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep',
            'card_issued', 'card_collected', 'pre_exam_prep', 'exam_chair_prep',
            'post_exam_chair_sterilize', 'tube_sterilization', 'suction_filter',
            'quartz_before', 'quartz_after', 'xray', 'model_cast', 'implant',
            'blood_pressure', 'complaint', 'absent',
            'total_amount',
        ];

        DB::transaction(function () use ($request, $fields, $nurseBonusRun) {
            foreach ($request->entries as $data) {
                $update = [];
                foreach ($fields as $f) {
                    $update[$f] = isset($data[$f]) && $data[$f] !== '' ? (float) $data[$f] : 0;
                }
                NurseBonusEntry::where('id', $data['id'])
                    ->where('nurse_bonus_run_id', $nurseBonusRun->id)
                    ->update($update);
            }
        });

        return back()->with('success', 'Урамшуулал хадгалагдлаа.');
    }

    public function finalize(Request $request, NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        $fields = [
            'clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep',
            'card_issued', 'card_collected', 'pre_exam_prep', 'exam_chair_prep',
            'post_exam_chair_sterilize', 'tube_sterilization', 'suction_filter',
            'quartz_before', 'quartz_after', 'xray', 'model_cast', 'implant',
            'blood_pressure', 'complaint', 'absent',
            'total_amount',
        ];

        DB::transaction(function () use ($request, $fields, $nurseBonusRun) {
            // Save current entry values first (if provided)
            if ($request->has('entries') && is_array($request->entries)) {
                foreach ($request->entries as $data) {
                    if (empty($data['id'])) continue;
                    $update = [];
                    foreach ($fields as $f) {
                        $update[$f] = isset($data[$f]) && $data[$f] !== '' ? (float) $data[$f] : 0;
                    }
                    NurseBonusEntry::where('id', $data['id'])
                        ->where('nurse_bonus_run_id', $nurseBonusRun->id)
                        ->update($update);
                }
            }

            $nurseBonusRun->update(['status' => 'final']);
        });

        $nurseBonusRun->load('entries.employee.user', 'entries.run');
        foreach ($nurseBonusRun->entries as $entry) {
            $user = $entry->employee?->user;
            if (!$user) continue;

            $entry->update(['is_sent' => true, 'sent_at' => now()]);
            try {
                $user->notify(new NurseBonusSent($entry));
            } catch (\Throwable $e) {
                \Log::warning("NurseBonusSent mail failed for user {$user->id}: " . $e->getMessage());
            }
        }

        return back()->with('success', 'Урамшуулал баталгаажлаа. Бүх ажилтанд мэдэгдэл илгээлээ.');
    }

    public function sendEntry(NurseBonusRun $nurseBonusRun, NurseBonusEntry $entry): RedirectResponse
    {
        if ($entry->nurse_bonus_run_id !== $nurseBonusRun->id) {
            return back()->with('error', 'Алдаатай хүсэлт.');
        }

        $entry->load('employee.user', 'run');
        $user = $entry->employee?->user;

        if (!$user) {
            return back()->with('error', 'Ажилтны системийн хэрэглэгч олдсонгүй.');
        }

        $entry->update(['is_sent' => true, 'sent_at' => now()]);
        try {
            $user->notify(new NurseBonusSent($entry));
        } catch (\Throwable $e) {
            \Log::warning("NurseBonusSent mail failed for user {$user->id}: " . $e->getMessage());
        }

        return back()->with('success', "{$entry->employee->full_name} ажилтанд урамшуулал илгээлээ.");
    }

    public function reopen(NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        $nurseBonusRun->update(['status' => 'draft']);
        return back()->with('success', 'Урамшуулал нээгдлээ.');
    }

    public function exportExcel(NurseBonusRun $nurseBonusRun): \Illuminate\Http\Response
    {
        $nurseBonusRun->load(['entries.employee.position']);
        $entries = $nurseBonusRun->entries->map(fn($e) => $this->formatEntry($e));
        $criteria = NurseBonusEntry::CRITERIA;

        $filename = 'nurse-bonus-' . $nurseBonusRun->year . '-' . $nurseBonusRun->month . '-' . $nurseBonusRun->half . '.xls';

        return response(
            view('hr.nurse-bonus-excel', compact('nurseBonusRun', 'entries', 'criteria'))->render(),
            200,
            [
                'Content-Type'        => 'application/vnd.ms-excel',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]
        );
    }

    public function destroy(NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        $nurseBonusRun->delete();
        return redirect()->route('hr.nurse-bonus.index')->with('success', 'Устгагдлаа.');
    }

    private function formatEntry(NurseBonusEntry $e): array
    {
        return [
            'id'                       => $e->id,
            'employee_id'              => $e->employee_id,
            'name'                     => $e->employee->full_name,
            'employee_number'          => $e->employee->employee_number,
            'position'                 => $e->employee->position?->name,
            'clothing'                 => $e->clothing,
            'hand_hygiene'             => $e->hand_hygiene,
            'chair_sterilization'      => $e->chair_sterilization,
            'equipment_prep'           => $e->equipment_prep,
            'material_prep'            => $e->material_prep,
            'card_issued'              => $e->card_issued,
            'card_collected'           => $e->card_collected,
            'pre_exam_prep'            => $e->pre_exam_prep,
            'exam_chair_prep'          => $e->exam_chair_prep,
            'post_exam_chair_sterilize'=> $e->post_exam_chair_sterilize,
            'tube_sterilization'       => $e->tube_sterilization,
            'suction_filter'           => $e->suction_filter,
            'quartz_before'            => $e->quartz_before,
            'quartz_after'             => $e->quartz_after,
            'xray'                     => $e->xray,
            'model_cast'               => $e->model_cast,
            'implant'                  => $e->implant,
            'blood_pressure'           => $e->blood_pressure,
            'complaint'                => $e->complaint,
            'absent'                   => $e->absent,
            'total_amount'             => $e->total_amount,
            'is_sent'                  => (bool) $e->is_sent,
        ];
    }
}
