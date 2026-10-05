<?php

namespace App\Services\Schedule;

use App\Models\HR\Employee;
use App\Models\HR\SchedulePattern;
use App\Models\HR\Shift;
use App\Models\HR\ShiftTemplate;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Хуваарийн бүх бичих үйлдэл. Нийтлэгдсэн мөрөнд шууд хүрэхгүй — өөрчлөлт бүр
 * ноорог болж, `publish()` дуудагдах үед л ажилтан, ирцэд хүрнэ.
 */
final class ShiftWriter
{
    /** @var Collection<int, ShiftTemplate>|null */
    private ?Collection $templates = null;

    public function __construct(
        private readonly ScheduleScope $scope,
        private readonly ?int $userId,
    ) {}

    /**
     * Олон нүдийг нэг гүйлгээнд солино.
     *
     * @param  list<array{employee_id: int, date: string, shifts: list<array<string, mixed>>}>  $days
     */
    public function apply(array $days, string $source = 'manual'): void
    {
        $employees = Employee::whereIn('id', array_column($days, 'employee_id'))->get()->keyBy('id');

        DB::transaction(function () use ($days, $employees, $source) {
            foreach ($days as $day) {
                $employee = $employees->get((int) $day['employee_id']);
                if (! $employee) {
                    continue;
                }
                $this->setDay($employee, (string) $day['date'], $day['shifts'] ?? [], $source);
            }
        });
    }

    /**
     * Нэг ажилтны нэг өдрийн ээлжүүдийг `$desired` жагсаалтаар солино.
     * id-тай мөр тухайн ээлжийг засна; id-гүй мөрийг одоо байгаатай дарааллаар нь тааруулна.
     *
     * @param  list<array<string, mixed>>  $desired
     */
    public function setDay(Employee $employee, string $date, array $desired, string $source = 'manual'): void
    {
        if (! $this->scope->allows($employee)) {
            throw new AuthorizationException('Энэ ажилтны хуваарийг гаргах эрхгүй байна.');
        }

        $effective = EffectiveShifts::resolve(Shift::where('employee_id', $employee->id)->whereDate('date', $date)->get());
        $current = $effective->reject(fn ($e) => $e['state'] === 'removed')->values();
        $removed = $effective->where('state', 'removed')->values();

        $items = array_map(fn ($d) => $this->normalize($employee, $d), array_values($desired));

        // 1) id-аар тааруулах
        $pairs = [];
        $usedCurrent = [];
        $usedRemoved = [];
        foreach ($items as $i => $item) {
            if (empty($item['id'])) {
                continue;
            }
            foreach ($current as $ci => $entry) {
                if (! isset($usedCurrent[$ci]) && $entry['shift']->id === $item['id']) {
                    $pairs[] = [$entry, $item];
                    $usedCurrent[$ci] = true;
                    unset($items[$i]);

                    continue 2;
                }
            }
            foreach ($removed as $ri => $entry) {
                if (! isset($usedRemoved[$ri]) && $entry['shift']->id === $item['id']) {
                    $pairs[] = [$entry, $item];
                    $usedRemoved[$ri] = true;
                    unset($items[$i]);

                    continue 2;
                }
            }
        }

        // 2) Үлдсэнийг дарааллаар нь (эхлэх цагаар) тааруулах — будах үед "солих" гэж тооцогдоно
        $remaining = $current->reject(fn ($e, $ci) => isset($usedCurrent[$ci]))->values();
        foreach (array_values($items) as $k => $item) {
            $pairs[] = [$remaining[$k] ?? null, $item];
        }
        $toDelete = $remaining->slice(count($items));

        foreach ($pairs as [$entry, $item]) {
            $this->write($employee, $date, $entry, $item, $source);
        }
        foreach ($toDelete as $entry) {
            $this->remove($entry);
        }
    }

    /** @param array{shift: Shift, state: string, base: ?Shift, draft: ?Shift}|null $entry */
    private function write(Employee $employee, string $date, ?array $entry, array $data, string $source): void
    {
        unset($data['id']);
        $meta = ['updated_by' => $this->userId];

        if ($entry === null) {
            Shift::create($data + $meta + [
                'employee_id' => $employee->id, 'date' => $date, 'status' => Shift::STATUS_DRAFT,
                'source' => $source, 'created_by' => $this->userId,
            ]);

            return;
        }

        switch ($entry['state']) {
            case 'new':
                $entry['draft']->update($data + $meta);
                break;

            case 'changed':
                self::sameContent($entry['base'], $data)
                    ? $entry['draft']->delete() // нийтлэгдсэн хувилбартаа буцсан
                    : $entry['draft']->update($data + $meta);
                break;

            case 'published':
                if (! self::sameContent($entry['shift'], $data)) {
                    Shift::create($data + $meta + [
                        'employee_id' => $employee->id, 'date' => $date, 'status' => Shift::STATUS_DRAFT,
                        'replaces_id' => $entry['shift']->id, 'source' => $source, 'created_by' => $this->userId,
                    ]);
                }
                break;

            case 'removed':
                self::sameContent($entry['base'], $data)
                    ? $entry['draft']->delete() // устгахаа болив
                    : $entry['draft']->update($data + $meta + ['is_removal' => false]);
                break;
        }
    }

    /** @param array{shift: Shift, state: string, base: ?Shift, draft: ?Shift} $entry */
    private function remove(array $entry): void
    {
        match ($entry['state']) {
            'new' => $entry['draft']->delete(),
            'changed' => $entry['draft']->update(['is_removal' => true, 'updated_by' => $this->userId]),
            'published' => Shift::create([
                'employee_id' => $entry['shift']->employee_id, 'date' => $entry['shift']->date->toDateString(),
                'status' => Shift::STATUS_DRAFT, 'replaces_id' => $entry['shift']->id, 'is_removal' => true,
                'kind' => $entry['shift']->kind, 'source' => 'manual',
                'created_by' => $this->userId, 'updated_by' => $this->userId,
            ]),
            default => null,
        };
    }

    /**
     * UI-аас ирсэн мөрийг хадгалах хэлбэрт оруулна: загварын цагийг бөглөх,
     * эмчид таарах ижил кодтой загварыг сонгох, салбарыг эрхийн хүрээнд барих.
     */
    private function normalize(Employee $employee, array $d): array
    {
        $templateId = $d['template_id'] ?? $d['shift_template_id'] ?? null;
        $template = $templateId ? $this->templates()->get((int) $templateId) : null;
        $branchId = isset($d['branch_id']) && $d['branch_id'] !== '' ? (int) $d['branch_id'] : null;

        if ($template) {
            $template = $this->mostSpecific($template, $employee->position_id, $branchId ?? $employee->branch_id);
        }

        $kind = $template?->kind ?? (($d['kind'] ?? 'work') === 'off' ? 'off' : 'work');

        if ($kind === ShiftTemplate::KIND_OFF) {
            return [
                'id' => isset($d['id']) ? (int) $d['id'] : null,
                'shift_template_id' => $template?->id, 'kind' => 'off', 'branch_id' => null,
                'start_time' => null, 'end_time' => null, 'break_minutes' => 0,
                'assigned_doctor_id' => null, 'room' => null,
                'note' => self::str($d['note'] ?? null, 500),
            ];
        }

        $branchId = $this->scope->lockedBranchId ?? $branchId ?? $employee->branch_id;
        if (! $this->scope->allowsBranch($branchId)) {
            throw ValidationException::withMessages(['branch_id' => 'Зөвхөн өөрийн салбарт ээлж тавина.']);
        }

        $explicit = array_key_exists('start_time', $d) || array_key_exists('end_time', $d);
        $start = $explicit ? self::time($d['start_time'] ?? null) : ShiftMath::hm($template?->start_time);
        $end = $explicit ? self::time($d['end_time'] ?? null) : ShiftMath::hm($template?->end_time);
        if (($start === null) !== ($end === null)) {
            throw ValidationException::withMessages(['start_time' => 'Эхлэх ба дуусах цагийг хоёуланг нь оруулна уу.']);
        }

        return [
            'id' => isset($d['id']) ? (int) $d['id'] : null,
            'shift_template_id' => $template?->id,
            'kind' => 'work',
            'branch_id' => $branchId,
            'start_time' => $start,
            'end_time' => $end,
            'break_minutes' => array_key_exists('break_minutes', $d)
                ? max(0, min(600, (int) $d['break_minutes']))
                : (int) ($template?->break_minutes ?? 0),
            'assigned_doctor_id' => ! empty($d['assigned_doctor_id']) && (int) $d['assigned_doctor_id'] !== $employee->id
                ? (int) $d['assigned_doctor_id'] : null,
            'room' => self::str($d['room'] ?? null, 50),
            'note' => self::str($d['note'] ?? null, 500),
        ];
    }

    /**
     * Эх 7 хоногийн хуваарийг гарагаар нь тааруулж зорилтот хугацаанд хуулна.
     *
     * @param  Collection<int, Employee>  $employees
     * @return int хуулсан ажилтан-өдрийн тоо
     */
    public function copyWeek(Collection $employees, Carbon $sourceMonday, Carbon $from, Carbon $to, bool $overwrite): int
    {
        $ids = $employees->pluck('id');
        $sourceEnd = $sourceMonday->copy()->addDays(6);

        $source = EffectiveShifts::live(EffectiveShifts::resolve(
            Shift::whereIn('employee_id', $ids)->whereBetween('date', [$sourceMonday->toDateString(), $sourceEnd->toDateString()])->get()
        ))->groupBy(fn (Shift $s) => $s->employee_id.'|'.$s->date->dayOfWeekIso);

        $targetLive = $this->liveIndex($ids, $from, $to);
        $leaves = LeaveCalendar::days($ids, $from->toDateString(), $to->toDateString());

        $days = [];
        foreach ($employees as $employee) {
            foreach (CarbonPeriod::create($from, $to) as $date) {
                $ds = $date->toDateString();
                if ($ds >= $sourceMonday->toDateString() && $ds <= $sourceEnd->toDateString()) {
                    continue; // эх долоо хоногийг өөр дээрээ хуулахгүй
                }
                $src = $source->get($employee->id.'|'.$date->dayOfWeekIso);
                if (! $src || isset($leaves[$employee->id][$ds]) || (! $overwrite && isset($targetLive[$employee->id][$ds]))) {
                    continue;
                }
                $days[] = ['employee_id' => $employee->id, 'date' => $ds, 'shifts' => $src->map(fn (Shift $s) => $s->content())->values()->all()];
            }
        }

        $this->apply($days, 'copy');

        return count($days);
    }

    /**
     * Давтагдах хэв маягаар хоосон өдрүүдийг бөглөнө. Батлагдсан чөлөөтэй өдрийг алгасна.
     *
     * @param  Collection<int, Employee>  $employees
     */
    public function generate(Collection $employees, Carbon $from, Carbon $to, bool $overwrite): int
    {
        $ids = $employees->pluck('id');
        $patterns = SchedulePattern::whereIn('employee_id', $ids)->where('is_active', true)->get()->keyBy('employee_id');
        $targetLive = $this->liveIndex($ids, $from, $to);
        $leaves = LeaveCalendar::days($ids, $from->toDateString(), $to->toDateString());

        $days = [];
        foreach ($employees as $employee) {
            $pattern = $patterns->get($employee->id);
            if (! $pattern) {
                continue;
            }
            foreach (CarbonPeriod::create($from, $to) as $date) {
                $ds = $date->toDateString();
                $entries = $pattern->entriesFor($date);
                if ($entries === [] || isset($leaves[$employee->id][$ds]) || (! $overwrite && isset($targetLive[$employee->id][$ds]))) {
                    continue;
                }
                $days[] = ['employee_id' => $employee->id, 'date' => $ds, 'shifts' => array_map(fn ($e) => [
                    'template_id' => (int) $e['template_id'],
                    'branch_id' => $e['branch_id'] ?? null,
                ], $entries)];
            }
        }

        $this->apply($days, 'pattern');

        return count($days);
    }

    /**
     * Ноорог бүрийг нийтэлнэ. Засварласан ноорог нийтлэгдсэн мөрөө дарж бичээд устана
     * (нийтлэгдсэн мөрийн id өөрчлөгдөхгүй — ээлж солих хүсэлт түүн рүү заадаг).
     *
     * @return array<int, list<array{date: string, change: string, label: string}>> ажилтан бүрийн өөрчлөлт
     */
    public function publish(Builder $drafts): array
    {
        $changes = [];
        $now = now();

        DB::transaction(function () use ($drafts, &$changes, $now) {
            foreach ($drafts->with(['template', 'branch', 'replaces.template', 'replaces.branch'])->get() as $draft) {
                $date = $draft->date->toDateString();
                $base = $draft->replaces;

                if ($draft->is_removal) {
                    if ($base) {
                        $changes[$draft->employee_id][] = ['date' => $date, 'change' => 'removed', 'label' => $base->label()];
                        $draft->delete();
                        $base->delete();
                    } else {
                        $draft->delete();
                    }

                    continue;
                }

                if ($base) {
                    $base->update($draft->only(Shift::CONTENT_FIELDS) + [
                        'published_at' => $now, 'updated_by' => $this->userId, 'source' => $draft->source ?? $base->source,
                    ]);
                    $changes[$draft->employee_id][] = ['date' => $date, 'change' => 'changed', 'label' => $draft->label()];
                    $draft->delete();
                } else {
                    $draft->update(['status' => Shift::STATUS_PUBLISHED, 'published_at' => $now, 'updated_by' => $this->userId]);
                    $changes[$draft->employee_id][] = ['date' => $date, 'change' => 'new', 'label' => $draft->label()];
                }
            }
        });

        return $changes;
    }

    /** Нийтлээгүй бүх өөрчлөлтийг цуцалж, нийтлэгдсэн төлөвт буцаана. */
    public function discard(Builder $drafts): int
    {
        return DB::transaction(fn () => $drafts->get()->each->delete()->count());
    }

    /** @return array<int, array<string, true>> */
    private function liveIndex(Collection $ids, Carbon $from, Carbon $to): array
    {
        $index = [];
        $live = EffectiveShifts::live(EffectiveShifts::resolve(
            Shift::whereIn('employee_id', $ids)->whereBetween('date', [$from->toDateString(), $to->toDateString()])->get()
        ));
        foreach ($live as $s) {
            $index[$s->employee_id][$s->date->toDateString()] = true;
        }

        return $index;
    }

    /**
     * Ижил кодтой загваруудаас тухайн албан тушаал/салбарт хамгийн тохирохыг сонгоно:
     * "Ө"-г эмчийн мөрөнд будахад эмчийн "Ө" (09:00–15:00), ресепшнд ерөнхий "Ө" (08:30–16:30).
     */
    private function mostSpecific(ShiftTemplate $chosen, ?int $positionId, ?int $branchId): ShiftTemplate
    {
        $score = fn (ShiftTemplate $t) => (empty($t->position_ids) ? 0 : 2) + ($t->branch_id ? 1 : 0);

        $best = $this->templates()
            ->filter(fn (ShiftTemplate $t) => $t->is_active && $t->code === $chosen->code && $t->kind === $chosen->kind
                && $t->appliesTo($positionId, $branchId))
            ->sortByDesc($score)
            ->first();

        if (! $best || ($chosen->appliesTo($positionId, $branchId) && $score($chosen) >= $score($best))) {
            return $chosen;
        }

        return $best;
    }

    /** @return Collection<int, ShiftTemplate> */
    private function templates(): Collection
    {
        // Идэвхгүй загварыг ч ачаална — хуучин ээлжийг хуулахад нэр/өнгө нь алдагдахгүй.
        return $this->templates ??= ShiftTemplate::orderBy('sort_order')->orderBy('id')->get()->keyBy('id');
    }

    public static function sameContent(Shift $shift, array $data): bool
    {
        $a = $shift->content();
        foreach (Shift::CONTENT_FIELDS as $field) {
            $b = $data[$field] ?? null;
            if (in_array($field, ['start_time', 'end_time'], true)) {
                $b = ShiftMath::hm($b);
            }
            if ($field === 'break_minutes') {
                $b = (int) $b;
            }
            if (in_array($field, ['room', 'note'], true)) {
                $b = $b ?: null;
            }
            if ($a[$field] != $b) {
                return false;
            }
        }

        return true;
    }

    private static function time(mixed $v): ?string
    {
        if (! is_string($v) || ! preg_match('/^([01]?\d|2[0-3]):([0-5]\d)/', $v, $m)) {
            return null;
        }

        return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
    }

    private static function str(mixed $v, int $max): ?string
    {
        $v = is_string($v) ? trim($v) : null;

        return $v ? mb_substr($v, 0, $max) : null;
    }
}
