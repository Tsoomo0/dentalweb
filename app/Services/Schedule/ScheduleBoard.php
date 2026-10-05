<?php

namespace App\Services\Schedule;

use App\Models\Branch;
use App\Models\HR\Employee;
use App\Models\HR\Position;
use App\Models\HR\ScheduleAvailability;
use App\Models\HR\SchedulePattern;
use App\Models\HR\Shift;
use App\Models\HR\ShiftTemplate;
use App\Models\HR\StaffingRule;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Хуваарийн хүснэгтийн (мөр = ажилтан, багана = өдөр) өгөгдлийг нэг дор бэлтгэнэ:
 * ээлжүүд (ноорог давхарласан), чөлөө, боломжгүй өдөр, хүн хүчний хүрэлцээ,
 * цагийн нийлбэр, дүрмийн анхааруулга, нийтлээгүй өөрчлөлтийн тоо.
 */
final class ScheduleBoard
{
    public function __construct(
        private readonly ScheduleScope $scope,
        private readonly ?int $branchId,
        private readonly Carbon $start,
        private readonly Carbon $end,
    ) {}

    public static function period(string $view, ?string $date): array
    {
        $focus = $date ? Carbon::parse($date) : today();

        return $view === 'month'
            ? [$focus->copy()->startOfMonth(), $focus->copy()->endOfMonth()->startOfDay()]
            : [$focus->copy()->startOfWeek(Carbon::MONDAY), $focus->copy()->endOfWeek(Carbon::SUNDAY)->startOfDay()];
    }

    /** Хүснэгтэд гарах ажилтнууд: үндсэн салбарынх + (HR) энэ салбарт ээлжтэй зочин ажилтан. */
    public function employees(): Collection
    {
        $home = Employee::with(['position:id,name,portal', 'doctor:id,employee_id'])
            ->where('status', 'active')
            ->when($this->branchId, fn (Builder $q) => $q->where('branch_id', $this->branchId))
            ->when($this->scope->positionIds !== null, fn (Builder $q) => $q->whereIn('position_id', $this->scope->positionIds))
            ->get();

        $guests = collect();
        if ($this->branchId && $this->scope->isHr()) {
            $guestIds = Shift::where('branch_id', $this->branchId)
                ->whereBetween('date', [$this->start->toDateString(), $this->end->toDateString()])
                ->whereNotIn('employee_id', $home->pluck('id'))
                ->distinct()->pluck('employee_id');

            $guests = Employee::with(['position:id,name,portal', 'doctor:id,employee_id'])
                ->whereIn('id', $guestIds)->where('status', 'active')->get()
                ->each(fn (Employee $e) => $e->setAttribute('is_guest', true));
        }

        return $home->concat($guests)
            ->sortBy(fn (Employee $e) => [self::isDoctor($e) ? 0 : 1, $e->position?->name ?? 'яяя', $e->last_name, $e->first_name])
            ->values();
    }

    /**
     * Нийтлэх/буцаах хамрах ноорог мөрүүд: үндсэн ажилтнуудын бүх ноорог,
     * зочин ажилтны зөвхөн энэ салбарын ноорог.
     */
    public function draftQuery(?Collection $employees = null): Builder
    {
        $employees ??= $this->employees();
        $home = $employees->reject(fn ($e) => $e->getAttribute('is_guest'))->pluck('id');
        $guests = $employees->filter(fn ($e) => $e->getAttribute('is_guest'))->pluck('id');
        $branchId = $this->branchId;

        return Shift::drafts()
            ->whereBetween('date', [$this->start->toDateString(), $this->end->toDateString()])
            ->where(function (Builder $q) use ($home, $guests, $branchId) {
                $q->whereIn('employee_id', $home);
                if ($guests->isNotEmpty() && $branchId) {
                    $q->orWhere(fn (Builder $g) => $g->whereIn('employee_id', $guests)->where(
                        fn (Builder $b) => $b->where('branch_id', $branchId)
                            ->orWhereHas('replaces', fn (Builder $r) => $r->where('branch_id', $branchId))
                    ));
                }
            });
    }

    public function build(): array
    {
        $from = $this->start->toDateString();
        $to = $this->end->toDateString();
        $employees = $this->employees();
        $ids = $employees->pluck('id');

        // Дүрэм шалгахад 7 хоногийн өмнөх өдрүүд болон бүтэн долоо хоногууд хэрэгтэй.
        $loadFrom = min($this->start->copy()->subDays(7), $this->start->copy()->startOfWeek(Carbon::MONDAY))->toDateString();
        $loadTo = max($this->end->copy(), $this->end->copy()->endOfWeek(Carbon::SUNDAY))->toDateString();

        $rows = Shift::with('template:id,code,name')
            ->whereIn('employee_id', $ids)
            ->whereBetween('date', [$loadFrom, $loadTo])
            ->get();

        $effective = EffectiveShifts::resolve($rows);
        $live = EffectiveShifts::live($effective);
        $inRange = fn (Shift $s) => $s->date->toDateString() >= $from && $s->date->toDateString() <= $to;

        $leaves = LeaveCalendar::days($ids, $from, $to, includePending: true);
        $unavailable = ScheduleAvailability::whereIn('employee_id', $ids)->whereBetween('date', [$from, $to])->get()
            ->groupBy('employee_id')
            ->map(fn ($list) => $list->mapWithKeys(fn ($a) => [$a->date->toDateString() => $a->note])->all())
            ->all();

        $branchNames = Branch::pluck('name', 'id');

        return [
            'period' => [
                'start' => $from,
                'end' => $to,
                'days' => collect(CarbonPeriod::create($from, $to))->map(fn ($d) => $d->toDateString())->values(),
            ],
            'branch_id' => $this->branchId,
            'employees' => $employees->map(fn (Employee $e) => [
                'id' => $e->id,
                'name' => $e->full_name,
                'short_name' => $e->short_name,
                'photo_url' => $e->photo_url,
                'position_id' => $e->position_id,
                'position' => $e->position?->name,
                'branch_id' => $e->branch_id,
                'is_doctor' => self::isDoctor($e),
                'is_guest' => (bool) $e->getAttribute('is_guest'),
            ])->values(),
            'shifts' => $effective->filter(fn ($e) => $inRange($e['shift']))->map(fn ($e) => [
                'id' => $e['shift']->id,
                'employee_id' => $e['shift']->employee_id,
                'date' => $e['shift']->date->toDateString(),
                'branch_id' => $e['shift']->branch_id,
                'template_id' => $e['shift']->shift_template_id,
                'kind' => $e['shift']->kind,
                'start_time' => ShiftMath::hm($e['shift']->start_time),
                'end_time' => ShiftMath::hm($e['shift']->end_time),
                'break_minutes' => (int) $e['shift']->break_minutes,
                'minutes' => $e['shift']->minutes(),
                'assigned_doctor_id' => $e['shift']->assigned_doctor_id,
                'room' => $e['shift']->room,
                'note' => $e['shift']->note,
                'state' => $e['state'],
                'was' => $e['base'] && $e['state'] === 'changed' ? self::shortLabel($e['base'], $branchNames) : null,
            ])->values(),
            'leaves' => collect($leaves)->flatMap(fn ($days, $emp) => collect($days)->map(fn ($l, $date) => [
                'employee_id' => (int) $emp, 'date' => $date, 'type' => $l['type'], 'label' => $l['label'], 'status' => $l['status'],
            ])->values())->values(),
            'unavailable' => collect($unavailable)->flatMap(fn ($days, $emp) => collect($days)->map(fn ($note, $date) => [
                'employee_id' => (int) $emp, 'date' => $date, 'note' => $note,
            ])->values())->values(),
            'hours' => $live->filter($inRange)->groupBy('employee_id')->map(fn ($l) => $l->sum(fn (Shift $s) => $s->minutes())),
            'coverage' => $this->coverage(),
            'conflicts' => ScheduleRules::check($live, $leaves, $unavailable, $from, $to),
            'patterns' => SchedulePattern::whereIn('employee_id', $ids)->where('is_active', true)->pluck('employee_id'),
            'draft_count' => $this->draftQuery($employees)->count(),
        ];
    }

    /**
     * Сонгосон салбарын хүн хүчний шаардлага ба бодит тоо (өдөр × албан тушаал).
     *
     * @return list<array{position_id: int, date: string, required: int, actual: int}>
     */
    private function coverage(): array
    {
        if (! $this->branchId) {
            return [];
        }

        $rules = StaffingRule::where('branch_id', $this->branchId)->get();
        if ($rules->isEmpty()) {
            return [];
        }

        $from = $this->start->toDateString();
        $to = $this->end->toDateString();

        // Ээлжийг салбар хооронд зөөсөн ноорог зөв тусахын тулд тухайн ажилтнуудын бүх мөрийг авна.
        $employeeIds = Shift::where('branch_id', $this->branchId)->whereBetween('date', [$from, $to])->distinct()->pluck('employee_id');
        $positions = Employee::whereIn('id', $employeeIds)->pluck('position_id', 'id');
        $live = EffectiveShifts::live(EffectiveShifts::resolve(
            Shift::whereIn('employee_id', $employeeIds)->whereBetween('date', [$from, $to])->get()
        ))->filter(fn (Shift $s) => $s->isWork() && $s->branch_id === $this->branchId);

        $counts = [];
        foreach ($live as $s) {
            $counts[$s->date->toDateString()][(int) $positions->get($s->employee_id)][$s->employee_id] = true;
        }

        $out = [];
        foreach (CarbonPeriod::create($from, $to) as $day) {
            foreach ($rules as $rule) {
                if (! $rule->appliesOn($day)) {
                    continue;
                }
                $date = $day->toDateString();
                $out[] = [
                    'position_id' => $rule->position_id,
                    'date' => $date,
                    'required' => $rule->min_count,
                    'actual' => count($counts[$date][$rule->position_id] ?? []),
                ];
            }
        }

        return $out;
    }

    public static function isDoctor(Employee $e): bool
    {
        return $e->position?->portal === 'doctor' || ($e->relationLoaded('doctor') && $e->doctor !== null);
    }

    private static function shortLabel(Shift $s, Collection $branchNames): string
    {
        $code = $s->template?->code ?? ($s->isWork() ? 'Ажил' : 'Амр');
        $time = $s->start_time && $s->end_time ? ' '.ShiftMath::hm($s->start_time).'–'.ShiftMath::hm($s->end_time) : '';
        $branch = $s->branch_id ? ' · '.($branchNames[$s->branch_id] ?? '') : '';

        return $code.$time.$branch;
    }

    /** Хуваарь гаргах UI-д хэрэгтэй тогтмол лавлах өгөгдөл. */
    public static function lookups(ScheduleScope $scope): array
    {
        return [
            'templates' => ShiftTemplate::active()->orderBy('sort_order')->orderBy('id')->get()->map->toBoard()->values(),
            'branches' => Branch::where('is_active', true)
                ->when($scope->lockedBranchId, fn ($q) => $q->where('id', $scope->lockedBranchId))
                ->orderBy('order')->orderBy('name')->get(['id', 'name'])
                ->map(fn ($b) => ['id' => $b->id, 'name' => $b->name, 'abbr' => mb_substr($b->name, 0, 3)])->values(),
            'doctors' => Employee::with(['position:id,portal', 'doctor:id,employee_id'])->where('status', 'active')->get()
                ->filter(fn (Employee $e) => self::isDoctor($e))
                ->map(fn (Employee $e) => ['id' => $e->id, 'name' => $e->short_name, 'branch_id' => $e->branch_id])
                ->sortBy('name')->values(),
            'positions' => Position::where('is_active', true)->orderBy('name')->get(['id', 'name', 'portal'])
                ->filter(fn ($p) => $scope->allowsPosition($p->id))->values(),
        ];
    }
}
