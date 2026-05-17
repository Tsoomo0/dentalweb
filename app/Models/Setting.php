<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    const CACHE_KEY = 'site_settings_all';

    const CACHE_TTL = 3600; // 1 цаг

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

    // ─── Helper: нэг утга авах (cache-тай) ──────────────────────────────────

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = static::allCached();

        if (! isset($all[$key])) {
            return $default;
        }

        $setting = $all[$key];

        return match ($setting['type'] ?? 'string') {
            'integer' => (int) $setting['value'],
            default => $setting['value'],
        };
    }

    // ─── Helper: бүх settings-г cache-аас авах ───────────────────────────────

    public static function allCached(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return static::all()->keyBy('key')->map(fn ($s) => [
                'value' => $s->value,
                'type' => $s->type,
            ])->toArray();
        });
    }

    // ─── Helper: cache цэвэрлэх ───────────────────────────────────────────────

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        foreach (['general', 'payment', 'email', 'system', 'branding'] as $group) {
            Cache::forget("settings_group_{$group}");
        }
    }

    // ─── Helper: утга хадгалах / шинэчлэх ────────────────────────────────────

    public static function set(string $key, mixed $value): void
    {
        static::where('key', $key)->update(['value' => (string) $value]);
        static::clearCache();
    }

    // ─── Helper: бүлгийн бүх settings авах (массив) ──────────────────────────

    public static function getGroup(string $group): array
    {
        return Cache::remember("settings_group_{$group}", self::CACHE_TTL, function () use ($group) {
            return static::where('group', $group)
                ->orderBy('id')
                ->get()
                ->keyBy('key')
                ->map(fn ($s) => $s->value)
                ->toArray();
        });
    }

    // ─── Helper: олон утга нэгт хадгалах ─────────────────────────────────────

    public static function bulkSet(array $data): void
    {
        foreach ($data as $key => $value) {
            static::where('key', $key)->update(['value' => (string) $value]);
        }
        static::clearCache();
    }
}
