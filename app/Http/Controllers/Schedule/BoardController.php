<?php

namespace App\Http\Controllers\Schedule;

use App\Http\Controllers\Controller;
use App\Http\Controllers\My\ProfileController;
use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\ScheduleAvailability;
use App\Models\HR\Shift;
use App\Models\HR\ShiftSwapRequest;
use App\Models\HR\ShiftTemplate;
use App\Models\HR\StaffingRule;
use App\Models\HR\WorkScheduleDay;
use App\Services\Schedule\EffectiveShifts;
use App\Services\Schedule\ScheduleBoard;
use App\Services\Schedule\ScheduleNotifier;
use App\Services\Schedule\ScheduleScope;
use App\Services\Schedule\ScheduleSettings;
use App\Services\Schedule\ShiftWriter;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Хуваарийн хүснэгт — HR (/hr/schedule) болон эрхтэй салбарын менежер
 * (/my/schedule-manage) хоёул энэ controller-ийг ашиглана; ялгаа нь ScheduleScope.
 *
 * Хуудсыг Inertia-аар ачаалж, нүд засах бүх үйлдэл JSON-оор шинэ хүснэгтийг буцаана
 * (будах, гарын товчоор оруулахад хуудас бүхэлдээ дахин ачаалагдахгүй).
 */
class BoardController extends Controller
{
    public function index(Request $request): Response
    {
        $scope = $this->scope($request);
        [$branchId, $view, $date] = $this->params($request, $scope);
        [$start, $end] = ScheduleBoard::period($view, $date);

        $props = [
            'portal' => $scope->portal,
            'route_base' => $scope->routeBase(),
            'locked_branch_id' => $scope->lockedBranchId,
            'view' => $view,
            'date' => $start->toDateString(),
            'branch' => $branchId,
            'tab' => $request->query('tab', 'board'),
            'board' => (new ScheduleBoard($scope, $branchId, $start, $end))->build(),
            ...ScheduleBoard::lookups($scope),
            'reception_tasks' => WorkScheduleDay::RECEPTION_TASKS,
            'nurse_tasks' => WorkScheduleDay::NURSE_TASKS,
        ];

        if ($scope->isHr()) {
            $props += $this->hrProps();
        } else {
            $props['manager_name'] = $scope->manager->full_name;
            $props['manager_position'] = $scope->manager->position?->name;
        }

        return Inertia::render('hr/schedule/index', $props);
    }

    public function board(Request $request): JsonResponse
    {
        return $this->respond($request);
    }

    /** Олон нүдийг солих: [{employee_id, date, shifts: [...]}]. Хоосон shifts = цэвэрлэх. */
    public function days(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        $data = $request->validate([
            'days' => 'required|array|max:1000',
            'days.*.employee_id' => 'required|integer|exists:employees,id',
            'days.*.date' => 'required|date_format:Y-m-d',
            'days.*.shifts' => 'present|array|max:4',
            'days.*.shifts.*.id' => 'nullable|integer',
            'days.*.shifts.*.template_id' => 'nullable|integer|exists:shift_templates,id',
            'days.*.shifts.*.kind' => 'nullable|in:work,off',
            'days.*.shifts.*.branch_id' => 'nullable|integer|exists:branches,id',
            'days.*.shifts.*.start_time' => 'nullable|date_format:H:i',
            'days.*.shifts.*.end_time' => 'nullable|date_format:H:i',
            'days.*.shifts.*.break_minutes' => 'nullable|integer|min:0|max:600',
            'days.*.shifts.*.assigned_doctor_id' => 'nullable|integer|exists:employees,id',
            'days.*.shifts.*.room' => 'nullable|string|max:50',
            'days.*.shifts.*.note' => 'nullable|string|max:500',
        ]);

        $this->writer($request, $scope)->apply($data['days']);

        return $this->respond($request);
    }

    /** Сонгосон 7 хоногийн хуваарийг одоогийн хугацаанд гарагаар нь хуулна. */
    public function copy(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        $data = $request->validate([
            'source_monday' => 'required|date_format:Y-m-d',
            'overwrite' => 'boolean',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'integer',
        ]);

        [$board, $start, $end] = $this->boardFor($request, $scope);
        $count = $this->writer($request, $scope)->copyWeek(
            $this->targets($board, $data['employee_ids'] ?? null),
            Carbon::parse($data['source_monday'])->startOfWeek(Carbon::MONDAY),
            $start, $end, (bool) ($data['overwrite'] ?? false),
        );

        return $this->respond($request, $count ? "{$count} өдрийн хуваарь хуулагдлаа." : 'Хуулах шинэ өдөр олдсонгүй.');
    }

    /** Давтагдах хэв маягаар хоосон өдрүүдийг бөглөнө. */
    public function generate(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        $data = $request->validate([
            'overwrite' => 'boolean',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'integer',
        ]);

        [$board, $start, $end] = $this->boardFor($request, $scope);
        $count = $this->writer($request, $scope)->generate(
            $this->targets($board, $data['employee_ids'] ?? null), $start, $end, (bool) ($data['overwrite'] ?? false),
        );

        return $this->respond($request, $count
            ? "Хэв маягаар {$count} өдөр бөглөгдлөө."
            : 'Бөглөх хоосон өдөр алга (эсвэл ажилтнуудад хэв маяг тохируулаагүй).');
    }

    public function publish(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        [$board, $start, $end] = $this->boardFor($request, $scope);

        $changes = $this->writer($request, $scope)->publish($board->draftQuery());
        ScheduleNotifier::published($changes, $start->toDateString(), $end->toDateString());

        $total = array_sum(array_map('count', $changes));
        $people = count($changes);

        return $this->respond($request, $total
            ? "Нийтлэгдлээ: {$total} өөрчлөлт, {$people} ажилтанд мэдэгдэл очлоо."
            : 'Нийтлэх өөрчлөлт алга.');
    }

    public function discard(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        [$board] = $this->boardFor($request, $scope);
        $count = $this->writer($request, $scope)->discard($board->draftQuery());

        return $this->respond($request, $count ? "{$count} өөрчлөлт буцаагдлаа." : 'Буцаах өөрчлөлт алга.');
    }

    /** A4 хэвтээ хэвлэх хуудас — ханан дээр наах хуваарь. */
    public function print(Request $request): Response
    {
        $scope = $this->scope($request);
        [$branchId, $view, $date] = $this->params($request, $scope);
        [$start, $end] = ScheduleBoard::period($view, $date);

        return Inertia::render('hr/schedule/print', [
            'board' => (new ScheduleBoard($scope, $branchId, $start, $end))->build(),
            'view' => $view,
            'branch_name' => $branchId ? Branch::find($branchId)?->name : 'Бүх салбар',
            ...ScheduleBoard::lookups($scope),
        ]);
    }

    /** Өдрийн хийх зүйлс — тухайн өдөр ажиллаж буй хүмүүсээс хариуцагч сонгоно. */
    public function tasks(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        $data = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'date' => 'required|date_format:Y-m-d',
        ]);
        $branchId = $scope->branch((int) $data['branch_id']);

        $day = WorkScheduleDay::where('branch_id', $branchId)->whereDate('date', $data['date'])->first()
            ?? WorkScheduleDay::whereNull('branch_id')->whereDate('date', $data['date'])->first();

        $working = EffectiveShifts::live(EffectiveShifts::resolve(
            Shift::whereDate('date', $data['date'])->whereIn('employee_id',
                Shift::whereDate('date', $data['date'])->where('branch_id', $branchId)->pluck('employee_id'))->get()
        ))->filter(fn (Shift $s) => $s->isWork() && $s->branch_id === $branchId)->pluck('employee_id')->unique();

        $staff = Employee::with('position:id,name')->where('status', 'active')
            ->where(fn ($q) => $q->whereIn('id', $working)->orWhere('branch_id', $branchId))
            ->orderBy('first_name')->get()
            ->map(fn (Employee $e) => [
                'id' => $e->id, 'name' => $e->short_name, 'position' => $e->position?->name,
                'working' => $working->contains($e->id),
            ])
            ->sortByDesc('working')->values();

        return response()->json(['tasks' => $day?->tasks ?? new \stdClass, 'staff' => $staff]);
    }

    public function saveTasks(Request $request): JsonResponse
    {
        $scope = $this->scope($request);
        $data = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'date' => 'required|date_format:Y-m-d',
            'tasks' => 'nullable|array',
        ]);

        WorkScheduleDay::updateOrCreate(
            ['branch_id' => $scope->branch((int) $data['branch_id']), 'date' => $data['date']],
            ['tasks' => $data['tasks'] ?? []],
        );

        return response()->json(['message' => 'Хийх зүйлс хадгалагдлаа.']);
    }

    // ── Туслах ──────────────────────────────────────────────────────────────

    private function scope(Request $request): ScheduleScope
    {
        if (! $request->routeIs('my.*')) {
            return ScheduleScope::hr();
        }

        $manager = ProfileController::resolveEmployee();
        abort_if(! $manager || ! $manager->canManageAnySchedule(), 403, 'Хуваарь гаргах эрхгүй байна.');
        abort_if(! $manager->branch_id, 403, 'Танд салбар оноогдоогүй байна.');

        return ScheduleScope::manager($manager->loadMissing('position'));
    }

    /** @return array{0: ?int, 1: string, 2: ?string} */
    private function params(Request $request, ScheduleScope $scope): array
    {
        $request->validate([
            'view' => 'nullable|in:week,month',
            'date' => 'nullable|date_format:Y-m-d',
        ]);

        $branch = $request->input('branch');
        $branchId = $branch === 'all' ? null : ($branch ? (int) $branch : null);
        if ($branch === null && $scope->isHr()) {
            // Анх ороход эхний салбар — ихэнх хуваарийг салбар бүрээр гаргадаг.
            $branchId = Branch::where('is_active', true)->orderBy('order')->orderBy('name')->value('id');
        }

        return [$scope->branch($branchId), $request->input('view', 'week'), $request->input('date')];
    }

    /** @return array{0: ScheduleBoard, 1: Carbon, 2: Carbon} */
    private function boardFor(Request $request, ScheduleScope $scope): array
    {
        [$branchId, $view, $date] = $this->params($request, $scope);
        [$start, $end] = ScheduleBoard::period($view, $date);

        return [new ScheduleBoard($scope, $branchId, $start, $end), $start, $end];
    }

    /** Хуулах/бөглөх ажилтнууд — зочин биш, сонгосон бол зөвхөн тэд. */
    private function targets(ScheduleBoard $board, ?array $ids): Collection
    {
        return $board->employees()
            ->reject(fn (Employee $e) => $e->getAttribute('is_guest'))
            ->when($ids, fn ($c) => $c->whereIn('id', array_map('intval', $ids)))
            ->values();
    }

    private function writer(Request $request, ScheduleScope $scope): ShiftWriter
    {
        return new ShiftWriter($scope, $request->user()?->id);
    }

    private function respond(Request $request, ?string $message = null): JsonResponse
    {
        [$board] = $this->boardFor($request, $this->scope($request));

        return response()->json(['board' => $board->build(), 'message' => $message]);
    }

    /** HR-ийн "Хүсэлт" ба "Тохиргоо" табын өгөгдөл. */
    private function hrProps(): array
    {
        $swaps = ShiftSwapRequest::with(['requester:id,first_name,last_name', 'target:id,first_name,last_name',
            'shift.template', 'shift.branch', 'targetShift.template', 'targetShift.branch'])
            ->where(fn ($q) => $q->whereIn('status', [ShiftSwapRequest::PENDING_PEER, ShiftSwapRequest::PENDING_APPROVAL])
                ->orWhere('updated_at', '>=', now()->subDays(14)))
            ->latest()->limit(100)->get()
            ->map(fn (ShiftSwapRequest $s) => [
                'id' => $s->id,
                'status' => $s->status,
                'status_label' => ShiftSwapRequest::STATUS_LABELS[$s->status] ?? $s->status,
                'is_swap' => $s->isSwap(),
                'requester' => $s->requester?->short_name,
                'target' => $s->target?->short_name,
                'shift' => $s->shift ? ['date' => $s->shift->date->toDateString(), 'label' => $s->shift->label()] : null,
                'target_shift' => $s->targetShift ? ['date' => $s->targetShift->date->toDateString(), 'label' => $s->targetShift->label()] : null,
                'note' => $s->note,
                'rejection_reason' => $s->rejection_reason,
                'created_at' => $s->created_at->format('Y-m-d H:i'),
            ]);

        $availability = ScheduleAvailability::with('employee:id,first_name,last_name,branch_id')
            ->whereDate('date', '>=', today())->orderBy('date')->limit(200)->get()
            ->map(fn ($a) => [
                'id' => $a->id, 'date' => $a->date->toDateString(), 'note' => $a->note,
                'employee' => $a->employee?->short_name, 'branch_id' => $a->employee?->branch_id,
            ]);

        $patternEmployees = Employee::with(['position:id,name', 'schedulePattern'])
            ->where('status', 'active')->orderBy('last_name')->orderBy('first_name')->get();

        return [
            'swaps' => $swaps,
            'availability' => $availability,
            'all_templates' => ShiftTemplate::orderBy('sort_order')->orderBy('id')->get()->map->toBoard()->values(),
            'staffing_rules' => StaffingRule::orderBy('branch_id')->get(['id', 'branch_id', 'position_id', 'min_count', 'weekdays']),
            'pattern_employees' => $patternEmployees->map(fn (Employee $e) => [
                'id' => $e->id, 'name' => $e->full_name, 'short_name' => $e->short_name,
                'position_id' => $e->position_id, 'position' => $e->position?->name, 'branch_id' => $e->branch_id,
                'pattern' => $e->schedulePattern ? [
                    'cycle_weeks' => $e->schedulePattern->cycle_weeks,
                    'starts_on' => $e->schedulePattern->starts_on->toDateString(),
                    'days' => $e->schedulePattern->days,
                    'is_active' => $e->schedulePattern->is_active,
                ] : null,
            ])->values(),
            'settings' => ScheduleSettings::all(),
        ];
    }
}
