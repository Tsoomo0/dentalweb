<?php

namespace App\Models\HR;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ажилтны давтагдах хэв маяг. `days` нь cycle_weeks*7 урттай массив,
 * индекс 0 = мөчлөгийн 1-р долоо хоногийн Даваа. Өдөр бүр:
 *   [] — хуваарь тавихгүй
 *   [{template_id: 3, branch_id: null}] — ажилтны үндсэн салбарт
 *   [{…Сансар}, {…Хороолол}] — нэг өдөр хоёр салбарт
 */
class SchedulePattern extends Model
{
    protected $fillable = ['employee_id', 'cycle_weeks', 'starts_on', 'days', 'is_active'];

    protected $casts = [
        'starts_on' => 'date',
        'days' => 'array',
        'cycle_weeks' => 'integer',
        'is_active' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Тухайн огнооны оруулгууд.
     *
     * @return list<array{template_id: int, branch_id: ?int}>
     */
    public function entriesFor(CarbonInterface $date): array
    {
        $cycle = max(1, $this->cycle_weeks);
        $anchor = $this->starts_on->copy()->startOfWeek(CarbonInterface::MONDAY);
        // Хоёулаа Даваа тул ялгавар 7-д яг хуваагдана; round нь бутархай хоногоос хамгаална.
        $weeks = (int) round($anchor->diffInDays($date->copy()->startOfWeek(CarbonInterface::MONDAY), false) / 7);
        $week = (($weeks % $cycle) + $cycle) % $cycle;
        $index = $week * 7 + ($date->dayOfWeekIso - 1);

        return array_values(array_filter(
            (array) ($this->days[$index] ?? []),
            fn ($e) => is_array($e) && ! empty($e['template_id']),
        ));
    }
}
