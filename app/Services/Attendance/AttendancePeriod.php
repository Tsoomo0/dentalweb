<?php

namespace App\Services\Attendance;

use Carbon\CarbonImmutable;

/**
 * Ирцийн тайлангийн үечлэл. Аль ч огноо өгөхөд түүнийг агуулсан үеийг буцаана:
 *
 *   half_month — сарын 1–15 / 16–сүүлийн өдөр (цалин хагас сараар бодогддог)
 *   month      — хуанлийн сар
 *   quarter    — улирал (1–3, 4–6, 7–9, 10–12 сар)
 *   half_year  — хагас жил (1–6, 7–12 сар)
 *   year       — хуанлийн жил
 */
final class AttendancePeriod
{
    public const TYPES = ['half_month', 'month', 'quarter', 'half_year', 'year'];

    private function __construct(
        public readonly string $type,
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
    ) {}

    public static function make(?string $type, ?string $date): self
    {
        $type = in_array($type, self::TYPES, true) ? $type : 'month';
        $d = self::parseDate($date) ?? CarbonImmutable::today();
        $month = $d->startOfMonth();
        $year = $d->startOfYear();

        [$from, $to] = match ($type) {
            'half_month' => $d->day <= 15
                ? [$month, $month->addDays(14)]
                : [$month->addDays(15), $month->endOfMonth()],
            'month' => [$month, $month->endOfMonth()],
            'quarter' => [$d->firstOfQuarter(), $d->lastOfQuarter()],
            'half_year' => $d->month <= 6
                ? [$year, $year->addMonths(5)->endOfMonth()]
                : [$year->addMonths(6), $year->endOfYear()],
            'year' => [$year, $year->endOfYear()],
        };

        return new self($type, $from->startOfDay(), $to->startOfDay());
    }

    /** Y-m-d биш, эсвэл байхгүй огноо бол null. */
    public static function parseDate(?string $date): ?CarbonImmutable
    {
        if (! $date || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return null;
        }

        $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $date);

        return $parsed && $parsed->format('Y-m-d') === $date ? $parsed : null;
    }

    public function previous(): self
    {
        return self::make($this->type, $this->from->subDay()->toDateString());
    }

    public function next(): self
    {
        return self::make($this->type, $this->to->addDay()->toDateString());
    }

    /**
     * Үеийн сар бүрийн [эхлэх, дуусах] — улирал/жилийн тайланг сараар задлахад.
     *
     * @return list<array{0: string, 1: string}>
     */
    public function months(): array
    {
        $out = [];
        for ($m = $this->from->startOfMonth(); $m <= $this->to; $m = $m->addMonth()) {
            $out[] = [
                max($m, $this->from)->toDateString(),
                min($m->endOfMonth()->startOfDay(), $this->to)->toDateString(),
            ];
        }

        return $out;
    }

    public function label(): string
    {
        $y = $this->from->year;
        $m = $this->from->month;

        return match ($this->type) {
            'half_month' => "{$y} оны {$m}-р сарын {$this->from->day}–{$this->to->day}",
            'month' => "{$y} оны {$m}-р сар",
            'quarter' => "{$y} оны {$this->from->quarter}-р улирал",
            'half_year' => $m === 1 ? "{$y} оны эхний хагас" : "{$y} оны сүүлийн хагас",
            'year' => "{$y} он",
        };
    }

    /** Огноон хүрээний товч тайлбар: «10.01 – 12.31» */
    public function rangeLabel(): string
    {
        return $this->from->format('Y.m.d').' – '.$this->to->format('Y.m.d');
    }

    public function toArray(): array
    {
        $today = CarbonImmutable::today();

        return [
            'type' => $this->type,
            'from' => $this->from->toDateString(),
            'to' => $this->to->toDateString(),
            'label' => $this->label(),
            'range' => $this->rangeLabel(),
            'days' => (int) $this->from->diffInDays($this->to) + 1,
            'prev' => $this->previous()->from->toDateString(),
            // Бүхэлдээ ирээдүйд орших үе рүү шилжүүлэхгүй — харах ирц алга
            'next' => $this->to < $today ? $this->next()->from->toDateString() : null,
            'is_current' => $this->from <= $today && $today <= $this->to,
        ];
    }
}
