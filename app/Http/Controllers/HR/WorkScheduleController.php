<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\OrthoSchedule;
use App\Models\HR\WorkSchedule;
use App\Models\HR\WorkScheduleDay;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WorkScheduleController extends Controller
{
    /** Албан тушаалын нэрээс бүлэг тодорхойлно (PDF дэх багана/хэсгүүд). */
    private function roleGroup(?string $position): string
    {
        $p = mb_strtolower($position ?? '');

        return match (true) {
            str_contains($p, 'туслах')                                 => 'assistant',
            str_contains($p, 'сувилагч')                               => 'nurse',
            str_contains($p, 'эмч')                                    => 'doctor',
            str_contains($p, 'рентген')                                => 'xray',
            str_contains($p, 'ресепшн') || str_contains($p, 'хүлээн')  => 'reception',
            str_contains($p, 'үйлчлэгч')                               => 'cleaner',
            str_contains($p, 'загвар') || str_contains($p, 'техник')   => 'technician',
            default                                                    => 'other',
        };
    }

    public function index(Request $request): Response
    {
        // Долоо хоногийн дурын өдрөөс эхлэлийг (Даваа) тооцно
        $focus = $request->date('date') ?? now();
        $weekStart = $focus->copy()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

        $employees = Employee::with(['position', 'branch'])
            ->where('status', 'active')
            ->orderBy('last_name')->orderBy('first_name')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'position_id' => $e->position_id,
                'position' => $e->position?->name,
                'role_group' => $this->roleGroup($e->position?->name),
                'branch_id' => $e->branch_id,
                'branch' => $e->branch?->name,
                'photo_url' => $e->photo_url,
            ])
            ->values();

        // Сувилагч/туслахыг хариуцуулах эмч нарын жагсаалт
        $doctors = $employees->where('role_group', 'doctor')
            ->map(fn ($e) => ['id' => $e['id'], 'name' => $e['name']])
            ->values();

        $schedules = WorkSchedule::whereBetween('date', [$weekStart, $weekEnd])
            ->get()
            ->map(fn ($s) => $this->format($s))
            ->values();

        $branches = Branch::where('is_active', true)
            ->orderBy('order')->orderBy('name')
            ->get()
            ->map(fn ($b) => ['id' => $b->id, 'name' => $b->name, 'abbr' => mb_substr($b->name, 0, 3)])
            ->values();

        // Өдрийн "Хийх ажил" төлөвлөгөө (date → tasks)
        $dayPlans = WorkScheduleDay::whereBetween('date', [$weekStart, $weekEnd])
            ->get()
            ->mapWithKeys(fn ($d) => [$d->date->format('Y-m-d') => $d->tasks ?? new \stdClass]);

        // ── Гажиг заслын хуваарь (нэг хуудсанд хамт ачаална — таб шууд солигдоно) ──
        $oYear = $request->integer('oyear', now()->year);
        $oMonth = $request->integer('omonth', now()->month);
        $oStart = Carbon::create($oYear, $oMonth, 1)->startOfMonth();
        $oEnd = $oStart->copy()->endOfMonth();

        $orthoEmployees = Employee::with('position')
            ->where('status', 'active')
            ->whereHas('position', fn ($q) => $q->where('name', 'like', '%гажиг%'))
            ->orderBy('last_name')->orderBy('first_name')
            ->get();
        $isOrthoAsst = fn (Employee $e) => str_contains(mb_strtolower($e->position?->name ?? ''), 'туслах');

        $orthoAssistants = $orthoEmployees->filter($isOrthoAsst)->map(fn ($e) => [
            'id' => $e->id, 'name' => $e->full_name, 'position' => $e->position?->name, 'photo_url' => $e->photo_url,
        ])->values();
        $orthoDoctors = $orthoEmployees->reject($isOrthoAsst)->map(fn ($e) => [
            'id' => $e->id, 'name' => $e->full_name, 'abbr' => mb_substr($e->first_name ?? $e->full_name, 0, 3),
        ])->values();
        $orthoSchedules = OrthoSchedule::whereBetween('date', [$oStart, $oEnd])
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id, 'employee_id' => $s->employee_id, 'date' => $s->date->format('Y-m-d'),
                'state' => $s->state, 'branch_id' => $s->branch_id, 'assigned_doctor_id' => $s->assigned_doctor_id, 'note' => $s->note,
            ])->values();

        return Inertia::render('hr/work-schedules/index', [
            'employees' => $employees,
            'doctors' => $doctors,
            'branches' => $branches,
            'schedules' => $schedules,
            'day_plans' => $dayPlans,
            'task_types' => WorkScheduleDay::TASK_TYPES,
            'week_start' => $weekStart->format('Y-m-d'),
            // Ortho
            'ortho_assistants' => $orthoAssistants,
            'ortho_doctors' => $orthoDoctors,
            'ortho_schedules' => $orthoSchedules,
            'ortho_states' => OrthoSchedule::STATES,
            'ortho_year' => $oYear,
            'ortho_month' => $oMonth,
        ]);
    }

    /**
     * Тухайн өдрийн "Хийх ажил" хэсгийг бүхэлд нь хадгална.
     */
    public function saveTasks(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'tasks' => 'nullable|array',
        ]);

        WorkScheduleDay::updateOrCreate(
            ['branch_id' => null, 'date' => $data['date']],
            ['tasks' => $data['tasks'] ?? []]
        );

        return back()->with('success', 'Хийх ажил хадгалагдлаа.');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'shift_type' => 'required|in:morning,afternoon,full,custom,off',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'room' => 'nullable|string|max:50',
            'assigned_doctor_id' => 'nullable|exists:employees,id',
            'duties' => 'nullable|array',
            'duties.*' => 'string|in:'.implode(',', array_keys(WorkSchedule::DUTIES)),
            'notes' => 'nullable|string|max:500',
        ]);

        $off = $data['shift_type'] === 'off';

        WorkSchedule::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'date' => $data['date']],
            [
                'shift_type' => $data['shift_type'],
                'start_time' => $off ? null : ($data['start_time'] ?? null),
                'end_time' => $off ? null : ($data['end_time'] ?? null),
                'room' => $data['room'] ?? null,
                'assigned_doctor_id' => $data['assigned_doctor_id'] ?? null,
                'duties' => $off ? null : ($data['duties'] ?? null),
                'notes' => $data['notes'] ?? null,
                'created_by' => Auth::id(),
                'deleted_at' => null,
            ]
        );

        return back()->with('success', 'Хуваарь хадгалагдлаа.');
    }

    public function destroy(WorkSchedule $workSchedule): RedirectResponse
    {
        $workSchedule->delete();

        return back()->with('success', 'Устгагдлаа.');
    }

    /**
     * Нэг ажилтны нэг ээлжийг 7 хоногийн бүх өдөр (эсвэл зөвхөн ажлын өдрүүд) рүү бөөнөөр тавина.
     */
    public function rowFill(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'week_start' => 'required|date',
            'shift_type' => 'required|in:morning,afternoon,full,custom,off',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'room' => 'nullable|string|max:50',
            'assigned_doctor_id' => 'nullable|exists:employees,id',
            'duties' => 'nullable|array',
            'duties.*' => 'string|in:'.implode(',', array_keys(WorkSchedule::DUTIES)),
            'weekdays_only' => 'boolean',
        ]);

        $weekStart = Carbon::parse($data['week_start'])->startOfWeek(Carbon::MONDAY);
        $off = $data['shift_type'] === 'off';
        $days = ($data['weekdays_only'] ?? false) ? 5 : 7;

        DB::transaction(function () use ($data, $weekStart, $off, $days) {
            for ($i = 0; $i < $days; $i++) {
                $date = $weekStart->copy()->addDays($i)->format('Y-m-d');

                WorkSchedule::updateOrCreate(
                    ['employee_id' => $data['employee_id'], 'date' => $date],
                    [
                        'shift_type' => $data['shift_type'],
                        'start_time' => $off ? null : ($data['start_time'] ?? null),
                        'end_time' => $off ? null : ($data['end_time'] ?? null),
                        'room' => $data['room'] ?? null,
                        'assigned_doctor_id' => $data['assigned_doctor_id'] ?? null,
                        'duties' => $off ? null : ($data['duties'] ?? null),
                        'created_by' => Auth::id(),
                        'deleted_at' => null,
                    ]
                );
            }
        });

        return back()->with('success', '7 хоногийн хуваарь тавигдлаа.');
    }

    /**
     * Өмнөх 7 хоногийн хуваарийг сонгосон 7 хоног руу хуулна.
     */
    public function copyWeek(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'target_week_start' => 'required|date',
        ]);

        $targetStart = Carbon::parse($data['target_week_start'])->startOfWeek(Carbon::MONDAY);
        $sourceStart = $targetStart->copy()->subWeek();
        $sourceEnd = $sourceStart->copy()->endOfWeek(Carbon::SUNDAY);

        $source = WorkSchedule::whereBetween('date', [$sourceStart, $sourceEnd])->get();
        $sourceDays = WorkScheduleDay::whereBetween('date', [$sourceStart, $sourceEnd])->get();

        DB::transaction(function () use ($source, $sourceDays, $sourceStart, $targetStart) {
            foreach ($source as $s) {
                $offsetDays = $sourceStart->diffInDays(Carbon::parse($s->date));
                $newDate = $targetStart->copy()->addDays($offsetDays)->format('Y-m-d');

                WorkSchedule::updateOrCreate(
                    ['employee_id' => $s->employee_id, 'date' => $newDate],
                    [
                        'shift_type' => $s->shift_type,
                        'start_time' => $s->start_time,
                        'end_time' => $s->end_time,
                        'room' => $s->room,
                        'assigned_doctor_id' => $s->assigned_doctor_id,
                        'duties' => $s->duties,
                        'notes' => $s->notes,
                        'created_by' => Auth::id(),
                        'deleted_at' => null,
                    ]
                );
            }

            foreach ($sourceDays as $d) {
                $offsetDays = $sourceStart->diffInDays(Carbon::parse($d->date));
                $newDate = $targetStart->copy()->addDays($offsetDays)->format('Y-m-d');

                WorkScheduleDay::updateOrCreate(
                    ['branch_id' => null, 'date' => $newDate],
                    ['tasks' => $d->tasks]
                );
            }
        });

        return back()->with('success', 'Өмнөх 7 хоногийн хуваарь хуулагдлаа.');
    }

    private function format(WorkSchedule $s): array
    {
        return [
            'id' => $s->id,
            'employee_id' => $s->employee_id,
            'date' => $s->date->format('Y-m-d'),
            'shift_type' => $s->shift_type,
            'shift_label' => $s->shift_label,
            'start_time' => $s->start_time ? substr($s->start_time, 0, 5) : null,
            'end_time' => $s->end_time ? substr($s->end_time, 0, 5) : null,
            'room' => $s->room,
            'assigned_doctor_id' => $s->assigned_doctor_id,
            'duties' => $s->duties ?? [],
            'notes' => $s->notes,
        ];
    }
}
