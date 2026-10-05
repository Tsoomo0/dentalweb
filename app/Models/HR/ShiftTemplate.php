<?php

namespace App\Models\HR;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftTemplate extends Model
{
    public const KIND_WORK = 'work';

    public const KIND_OFF = 'off';

    protected $fillable = [
        'branch_id', 'name', 'code', 'kind', 'start_time', 'end_time',
        'break_minutes', 'color', 'position_ids', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'position_ids' => 'array',
        'break_minutes' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    public function isWork(): bool
    {
        return $this->kind === self::KIND_WORK;
    }

    /** Тухайн албан тушаал, салбарт хэрэглэгдэх эсэх. */
    public function appliesTo(?int $positionId, ?int $branchId): bool
    {
        if ($this->branch_id && $branchId && $this->branch_id !== $branchId) {
            return false;
        }

        return empty($this->position_ids) || ($positionId && in_array($positionId, $this->position_ids, true));
    }

    public function toBoard(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'kind' => $this->kind,
            'start_time' => $this->start_time ? substr($this->start_time, 0, 5) : null,
            'end_time' => $this->end_time ? substr($this->end_time, 0, 5) : null,
            'break_minutes' => $this->break_minutes,
            'color' => $this->color,
            'branch_id' => $this->branch_id,
            'position_ids' => $this->position_ids ? array_map('intval', $this->position_ids) : null,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
        ];
    }
}
