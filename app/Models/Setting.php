<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'group',
        'label',
        'description',
        'type',
        'is_sensitive',
    ];

    protected $casts = [
        'is_sensitive' => 'boolean',
    ];

    // ─── Helper: нэг утга авах ────────────────────────────────────────────────

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        if (! $setting) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => $setting->value,
            'integer' => (int) $setting->value,
            default   => $setting->value,
        };
    }

    // ─── Helper: утга хадгалах / шинэчлэх ────────────────────────────────────

    public static function set(string $key, mixed $value): void
    {
        static::where('key', $key)->update(['value' => (string) $value]);
    }

    // ─── Helper: бүлгийн бүх settings авах (массив) ──────────────────────────

    public static function getGroup(string $group): array
    {
        return static::where('group', $group)
            ->orderBy('id')
            ->get()
            ->keyBy('key')
            ->map(fn($s) => $s->value)
            ->toArray();
    }

    // ─── Helper: олон утга нэгт хадгалах ─────────────────────────────────────

    public static function bulkSet(array $data): void
    {
        foreach ($data as $key => $value) {
            static::where('key', $key)->update(['value' => (string) $value]);
        }
    }
}
