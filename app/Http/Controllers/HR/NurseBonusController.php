<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
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
            ->withCount(['entries as sent_entries_count' => fn ($q) => $q->where('is_sent', true)])
            ->withSum('entries as total_amount', 'total_amount')
            ->with(['creator', 'employee'])
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'title' => $r->title,
                'date' => $r->date?->toDateString(),
                'year' => $r->year,
                'month' => $r->month,
                'half' => $r->half,
                'half_label' => $r->half_label,
                'label' => $r->label,
                'employee_id' => $r->employee_id,
                'employee_name' => $r->employee ? trim($r->employee->last_name.' '.$r->employee->first_name) : null,
                'status' => $r->status,
                'entries_count' => $r->entries_count,
                'sent_entries_count' => $r->sent_entries_count,
                'total_amount' => (float) ($r->total_amount ?? 0),
                'created_at' => $r->created_at->format('Y.m.d'),
                'created_by' => $r->creator?->name,
            ]);

        $branches = Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        // Бүх сувилагч ажилтнуудыг салбараар + нэрээр буцаана (форм-д ашиглана)
        $nurses = Employee::with('position')
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->whereHas('position', fn ($q) => $q->whereRaw('LOWER(TRIM(name)) = ?', ['сувилагч']))
            ->orderBy('last_name')
            ->get()
            ->map(fn ($e) => [
                'id'        => $e->id,
                'name'      => trim($e->last_name.' '.$e->first_name),
                'branch_id' => $e->branch_id,
            ])
            ->values();

        return Inertia::render('hr/nurse-bonus/index', [
            'runs' => $runs,
            'branches' => $branches,
            'nurses' => $nurses,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'year'        => 'required|integer|min:2020|max:2100',
            'month'       => 'required|integer|min:1|max:12',
            'half'        => 'required|in:first,second',
            'branch_id'   => 'required|exists:branches,id',
            'employee_id' => 'required|exists:employees,id',
            'notes'       => 'nullable|string|max:500',
        ]);

        $branch = Branch::findOrFail($request->branch_id);
        $employee = Employee::findOrFail($request->employee_id);

        $run = NurseBonusRun::create([
            'year' => $request->year,
            'month' => $request->month,
            'half' => $request->half,
            'label' => $branch->name,
            'branch_id' => $request->branch_id,
            'employee_id' => $employee->id,
            'notes' => $request->notes,
            'status' => 'draft',
            'created_by' => Auth::id(),
        ]);

        return redirect()->route('hr.nurse-bonus.show', $run)
            ->with('success', 'Урамшууллын тооцоо үүсгэгдлээ.');
    }

    public function show(NurseBonusRun $nurseBonusRun): Response
    {
        $nurseBonusRun->load(['employee.position', 'entries.doctor', 'branch']);

        $entries = $nurseBonusRun->entries
            ->sortBy('date')
            ->values()
            ->map(fn ($e) => $this->formatEntry($e));

        // Тухайн салбарын идэвхтэй эмчүүд (сонгох жагсаалт)
        $doctors = Doctor::where('is_active', true)
            ->when($nurseBonusRun->branch_id, fn ($q) => $q->whereHas('branches', fn ($b) => $b->where('branches.id', $nurseBonusRun->branch_id)))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('hr/nurse-bonus/show', [
            'run' => [
                'id' => $nurseBonusRun->id,
                'title' => $nurseBonusRun->title,
                'year' => $nurseBonusRun->year,
                'month' => $nurseBonusRun->month,
                'half' => $nurseBonusRun->half,
                'half_label' => $nurseBonusRun->half_label,
                'label' => $nurseBonusRun->label,
                'status' => $nurseBonusRun->status,
                'notes' => $nurseBonusRun->notes,
                'branch_name' => $nurseBonusRun->branch?->name,
                'employee_id' => $nurseBonusRun->employee_id,
                'employee_name' => $nurseBonusRun->employee
                    ? trim($nurseBonusRun->employee->last_name.' '.$nurseBonusRun->employee->first_name)
                    : null,
                'employee_position' => $nurseBonusRun->employee?->position?->name,
            ],
            'entries'  => $entries,
            'doctors'  => $doctors,
            'criteria' => NurseBonusEntry::CRITERIA,
        ]);
    }

    public function addEntry(Request $request, NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        if ($nurseBonusRun->status === 'final') {
            return back()->with('error', 'Баталгаажсан тооцоог засах боломжгүй.');
        }

        $request->validate([
            'date' => 'required|date',
        ]);

        NurseBonusEntry::create([
            'nurse_bonus_run_id' => $nurseBonusRun->id,
            'employee_id'        => $nurseBonusRun->employee_id,
            'date'               => $request->date,
        ]);

        return back()->with('success', 'Мөр нэмэгдлээ.');
    }

    public function removeEntry(NurseBonusRun $nurseBonusRun, NurseBonusEntry $entry): RedirectResponse
    {
        if ($nurseBonusRun->status === 'final') {
            return back()->with('error', 'Баталгаажсан тооцоог засах боломжгүй.');
        }

        if ($entry->nurse_bonus_run_id !== $nurseBonusRun->id) {
            return back()->with('error', 'Тохирох мөр олдсонгүй.');
        }

        $entry->delete();

        return back()->with('success', 'Мөр устгагдлаа.');
    }

    public function update(Request $request, NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        if ($nurseBonusRun->status === 'final') {
            return back()->with('error', 'Баталгаажсан тооцоог засах боломжгүй.');
        }

        $request->validate([
            'entries' => 'nullable|array',
            'entries.*.id' => 'required|exists:nurse_bonus_entries,id',
        ]);

        if (empty($request->entries)) {
            return back()->with('success', 'Хадгалах мөр алга.');
        }

        $fields = [
            'doctor_id',
            'clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep',
            'visit_count',
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
                    if ($f === 'doctor_id') {
                        $update[$f] = $data[$f] ?? null;
                    } else {
                        $update[$f] = isset($data[$f]) && $data[$f] !== '' ? (float) $data[$f] : 0;
                    }
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
        if ($nurseBonusRun->status === 'final') {
            return back()->with('info', 'Аль хэдийн баталгаажсан байна.');
        }

        // Эхлээд хадгал
        if ($request->has('entries') && is_array($request->entries)) {
            $this->update($request, $nurseBonusRun);
        }

        $nurseBonusRun->update(['status' => 'final']);

        // Сувилагчид мэдэгдэл явуулна
        $nurseBonusRun->load('employee.user', 'entries');
        $user = $nurseBonusRun->employee?->user;
        if ($user) {
            // Бүх entry-г илгээсэн гэж тэмдэглэнэ
            $nurseBonusRun->entries()->update(['is_sent' => true, 'sent_at' => now()]);
            // Эхний entry-р notification (run-ийн нэгтгэсэн дүнг үзүүлэх зорилгоор)
            $firstEntry = $nurseBonusRun->entries->first();
            if ($firstEntry) {
                try {
                    $user->notify(new NurseBonusSent($firstEntry));
                } catch (\Throwable $e) {
                    \Log::warning("NurseBonusSent failed: ".$e->getMessage());
                }
            }
        }

        return back()->with('success', 'Урамшуулал баталгаажиж ажилтанд илгээгдлээ.');
    }

    public function bulkFinalize(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:nurse_bonus_runs,id',
        ]);

        $runs = NurseBonusRun::whereIn('id', $request->ids)
            ->where('status', 'draft')
            ->with('employee.user', 'entries')
            ->get();

        $sent = 0;
        foreach ($runs as $run) {
            $run->update(['status' => 'final']);
            $run->entries()->update(['is_sent' => true, 'sent_at' => now()]);

            $user = $run->employee?->user;
            $firstEntry = $run->entries->first();
            if ($user && $firstEntry) {
                try {
                    $user->notify(new NurseBonusSent($firstEntry));
                    $sent++;
                } catch (\Throwable $e) {
                    \Log::warning('NurseBonusSent bulk failed: '.$e->getMessage());
                }
            }
        }

        return back()->with('success', "{$sent} ажилтанд урамшуулал илгээгдлээ.");
    }

    public function reopen(NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        $nurseBonusRun->update(['status' => 'draft']);

        return back()->with('success', 'Урамшуулал нээгдлээ.');
    }

    public function destroy(NurseBonusRun $nurseBonusRun): RedirectResponse
    {
        $nurseBonusRun->delete();

        return redirect()->route('hr.nurse-bonus.index')->with('success', 'Устгагдлаа.');
    }

    public function exportExcel(NurseBonusRun $nurseBonusRun): \Illuminate\Http\Response
    {
        $nurseBonusRun->load(['employee.position', 'entries.doctor', 'branch']);
        $entries = $nurseBonusRun->entries->sortBy('date')->values()
            ->map(fn ($e) => $this->formatEntry($e));
        $criteria = NurseBonusEntry::CRITERIA;

        $filename = 'nurse-bonus-'.$nurseBonusRun->year.'-'.$nurseBonusRun->month.'-'.$nurseBonusRun->half.'.xls';

        return response(
            view('hr.nurse-bonus-excel', compact('nurseBonusRun', 'entries', 'criteria'))->render(),
            200,
            [
                'Content-Type' => 'application/vnd.ms-excel',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]
        );
    }

    private function formatEntry(NurseBonusEntry $e): array
    {
        return [
            'id' => $e->id,
            'date' => $e->date?->toDateString(),
            'doctor_id' => $e->doctor_id,
            'doctor_name' => $e->doctor?->name,
            'clothing' => $e->clothing,
            'hand_hygiene' => $e->hand_hygiene,
            'chair_sterilization' => $e->chair_sterilization,
            'equipment_prep' => $e->equipment_prep,
            'material_prep' => $e->material_prep,
            'visit_count' => $e->visit_count,
            'card_issued' => $e->card_issued,
            'card_collected' => $e->card_collected,
            'pre_exam_prep' => $e->pre_exam_prep,
            'exam_chair_prep' => $e->exam_chair_prep,
            'post_exam_chair_sterilize' => $e->post_exam_chair_sterilize,
            'tube_sterilization' => $e->tube_sterilization,
            'suction_filter' => $e->suction_filter,
            'quartz_before' => $e->quartz_before,
            'quartz_after' => $e->quartz_after,
            'xray' => $e->xray,
            'model_cast' => $e->model_cast,
            'implant' => $e->implant,
            'blood_pressure' => $e->blood_pressure,
            'complaint' => $e->complaint,
            'absent' => $e->absent,
            'total_amount' => $e->total_amount,
            'is_sent' => (bool) $e->is_sent,
        ];
    }
}
