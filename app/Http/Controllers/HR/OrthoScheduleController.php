<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\OrthoSchedule;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrthoScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $year = $request->integer('year', now()->year);
        $month = $request->integer('month', now()->month);

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        // Гажиг заслын ажилтнууд (position-д "гажиг" орсон)
        $orthoEmployees = Employee::with('position')
            ->where('status', 'active')
            ->whereHas('position', fn ($q) => $q->where('name', 'like', '%гажиг%'))
            ->orderBy('last_name')->orderBy('first_name')
            ->get();

        $isAssistant = fn (Employee $e) => str_contains(mb_strtolower($e->position?->name ?? ''), 'туслах');

        $assistants = $orthoEmployees->filter($isAssistant)->map(fn ($e) => [
            'id' => $e->id,
            'name' => $e->full_name,
            'position' => $e->position?->name,
            'photo_url' => $e->photo_url,
        ])->values();

        $doctors = $orthoEmployees->reject($isAssistant)->map(fn ($e) => [
            'id' => $e->id,
            'name' => $e->full_name,
            'abbr' => mb_substr($e->first_name ?? $e->full_name, 0, 3),
        ])->values();

        $branches = Branch::where('is_active', true)
            ->orderBy('order')->orderBy('name')
            ->get()
            ->map(fn ($b) => ['id' => $b->id, 'name' => $b->name, 'abbr' => mb_substr($b->name, 0, 3)])
            ->values();

        $schedules = OrthoSchedule::whereBetween('date', [$start, $end])
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'employee_id' => $s->employee_id,
                'date' => $s->date->format('Y-m-d'),
                'state' => $s->state,
                'branch_id' => $s->branch_id,
                'assigned_doctor_id' => $s->assigned_doctor_id,
                'note' => $s->note,
            ])
            ->values();

        return Inertia::render('hr/ortho-schedules/index', [
            'assistants' => $assistants,
            'doctors' => $doctors,
            'branches' => $branches,
            'schedules' => $schedules,
            'states' => OrthoSchedule::STATES,
            'year' => $year,
            'month' => $month,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'state' => 'required|in:'.implode(',', array_keys(OrthoSchedule::STATES)),
            'branch_id' => 'nullable|exists:branches,id',
            'assigned_doctor_id' => 'nullable|exists:employees,id',
            'note' => 'nullable|string|max:255',
        ]);

        $work = $data['state'] === 'work';

        OrthoSchedule::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'date' => $data['date']],
            [
                'state' => $data['state'],
                'branch_id' => $work ? ($data['branch_id'] ?? null) : null,
                'assigned_doctor_id' => $work ? ($data['assigned_doctor_id'] ?? null) : null,
                'note' => $data['note'] ?? null,
                'created_by' => Auth::id(),
            ]
        );

        return back()->with('success', 'Хадгалагдлаа.');
    }

    public function destroy(OrthoSchedule $orthoSchedule): RedirectResponse
    {
        $orthoSchedule->delete();

        return back()->with('success', 'Устгагдлаа.');
    }

    /**
     * Огнооны мужид (ж: Наадам 7-р сарын 11-15) нэг төлөвийг бөөнөөр оруулна.
     * all_assistants=true бол бүх гажиг заслын туслах эмчид мөрдөнө.
     */
    public function range(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:date',
            'state' => 'required|in:'.implode(',', array_keys(OrthoSchedule::STATES)),
            'branch_id' => 'nullable|exists:branches,id',
            'assigned_doctor_id' => 'nullable|exists:employees,id',
            'all_assistants' => 'boolean',
        ]);

        $empIds = ! empty($data['all_assistants'])
            ? Employee::where('status', 'active')
                ->whereHas('position', fn ($q) => $q->where('name', 'like', '%гажиг%')->where('name', 'like', '%туслах%'))
                ->pluck('id')->all()
            : array_filter([$data['employee_id'] ?? null]);

        if (empty($empIds)) {
            return back()->with('error', 'Ажилтан сонгогдоогүй.');
        }

        $work = $data['state'] === 'work';
        $start = Carbon::parse($data['date']);
        $end = Carbon::parse($data['end_date']);

        DB::transaction(function () use ($empIds, $start, $end, $data, $work) {
            foreach ($empIds as $eid) {
                for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
                    OrthoSchedule::updateOrCreate(
                        ['employee_id' => $eid, 'date' => $d->format('Y-m-d')],
                        [
                            'state' => $data['state'],
                            'branch_id' => $work ? ($data['branch_id'] ?? null) : null,
                            'assigned_doctor_id' => $work ? ($data['assigned_doctor_id'] ?? null) : null,
                            'created_by' => Auth::id(),
                        ]
                    );
                }
            }
        });

        return back()->with('success', 'Хугацааны хуваарь оруулагдлаа.');
    }

    /** Огнооны мужид нэг ажилтны хуваарийг бөөнөөр устгана. */
    public function clearRange(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:date',
        ]);

        OrthoSchedule::where('employee_id', $data['employee_id'])
            ->whereBetween('date', [$data['date'], $data['end_date']])
            ->delete();

        return back()->with('success', 'Устгагдлаа.');
    }
}
