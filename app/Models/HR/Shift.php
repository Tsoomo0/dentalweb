<?php

namespace App\Models\HR;

use App\Models\Branch;
use App\Models\User;
use App\Services\Schedule\ShiftMath;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Нэг ажилтны нэг ээлж. Ноорог/нийтлэгдсэн хувилбарын тайлбарыг
 * create_shifts_table migration-оос үзнэ үү.
 */
class Shift extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    /** Ноорог нийтлэгдсэнтэй ижил эсэхийг харьцуулах талбарууд. */
    public const CONTENT_FIELDS = [
        'branch_id', 'shift_template_id', 'kind', 'start_time', 'end_time',
        'break_minutes', 'assigned_doctor_id', 'room', 'note',
    ];

    protected $fillable = [
        'employee_id', 'branch_id', 'date', 'shift_template_id', 'kind',
        'start_time', 'end_time', 'break_minutes', 'assigned_doctor_id', 'room', 'note',
        'status', 'replaces_id', 'is_removal', 'published_at', 'source', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'date' => 'date',
        'break_minutes' => 'integer',
        'is_removal' => 'boolean',
        'published_at' => 'datetime',
    ];

    /** Огноог үргэлж Y-m-d хэлбэрээр хадгална — whereBetween('date', …) SQLite дээр ч зөв ажиллана. */
    protected function date(): Attribute
    {
        return Attribute::make(set: fn ($value) => $value ? Carbon::parse($value)->toDateString() : null);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ShiftTemplate::class, 'shift_template_id');
    }

    public function assignedDoctor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_doctor_id');
    }

    public function replaces(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaces_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Ажилтан, ирц зөвхөн эдгээрийг хардаг. */
    public function scopePublished(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_PUBLISHED);
    }

    public function scopeDrafts(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_DRAFT);
    }

    public function scopeWork(Builder $q): Builder
    {
        return $q->where('kind', ShiftTemplate::KIND_WORK);
    }

    public function isWork(): bool
    {
        return $this->kind === ShiftTemplate::KIND_WORK;
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /** Цайны цагийг хассан ажлын минут (цаггүй ажлын ээлж = 0). */
    public function minutes(): int
    {
        return $this->isWork() ? ShiftMath::minutes($this->start_time, $this->end_time, $this->break_minutes) : 0;
    }

    /** @return array<string, mixed> */
    public function content(): array
    {
        return [
            'branch_id' => $this->branch_id,
            'shift_template_id' => $this->shift_template_id,
            'kind' => $this->kind,
            'start_time' => ShiftMath::hm($this->start_time),
            'end_time' => ShiftMath::hm($this->end_time),
            'break_minutes' => (int) $this->break_minutes,
            'assigned_doctor_id' => $this->assigned_doctor_id,
            'room' => $this->room ?: null,
            'note' => $this->note ?: null,
        ];
    }

    /** Хүн уншихуйц товч — "Өглөө 08:30–16:30 · Сансар". */
    public function label(): string
    {
        $name = $this->template?->name ?? ($this->isWork() ? 'Ажил' : 'Амралт');
        $time = $this->start_time && $this->end_time
            ? ' '.ShiftMath::hm($this->start_time).'–'.ShiftMath::hm($this->end_time)
            : '';
        $branch = $this->isWork() && $this->branch ? ' · '.$this->branch->name : '';

        return $name.$time.$branch;
    }
}
