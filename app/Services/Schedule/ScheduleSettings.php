<?php

namespace App\Services\Schedule;

use App\Models\Setting;

/**
 * Хуваарь ба ирцийн дүрмийн тохиргоо (`settings`, бүлэг `schedule`).
 * Утга алга эсвэл согогтой бол аюулгүй анхны утга буцаана.
 */
final class ScheduleSettings
{
    /** түлхүүр => [анхны утга, доод, дээд] */
    public const DEFAULTS = [
        'schedule_late_grace_minutes' => [5, 0, 60],
        'schedule_overtime_min_minutes' => [15, 0, 240],
        'schedule_weekly_hours_limit' => [40, 1, 100],
        'schedule_min_rest_hours' => [11, 0, 24],
        'schedule_max_consecutive_days' => [6, 1, 31],
    ];

    public static function lateGrace(): int
    {
        return self::int('schedule_late_grace_minutes');
    }

    public static function overtimeMin(): int
    {
        return self::int('schedule_overtime_min_minutes');
    }

    public static function weeklyHoursLimit(): int
    {
        return self::int('schedule_weekly_hours_limit');
    }

    public static function minRestHours(): int
    {
        return self::int('schedule_min_rest_hours');
    }

    public static function maxConsecutiveDays(): int
    {
        return self::int('schedule_max_consecutive_days');
    }

    /** @return array<string, int> */
    public static function all(): array
    {
        return collect(array_keys(self::DEFAULTS))->mapWithKeys(fn ($k) => [$k => self::int($k)])->all();
    }

    /** @param array<string, int> $values */
    public static function save(array $values): void
    {
        foreach (self::DEFAULTS as $key => [$default, $min, $max]) {
            if (! array_key_exists($key, $values)) {
                continue;
            }

            Setting::updateOrCreate(['key' => $key], [
                'value' => (string) max($min, min($max, (int) $values[$key])),
                'group' => 'schedule',
                'type' => 'integer',
            ]);
        }

        Setting::clearCache();
    }

    private static function int(string $key): int
    {
        [$default, $min, $max] = self::DEFAULTS[$key];
        $value = Setting::get($key);

        return is_numeric($value) ? max($min, min($max, (int) $value)) : $default;
    }
}
