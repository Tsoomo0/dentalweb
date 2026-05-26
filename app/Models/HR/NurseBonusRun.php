<?php

namespace App\Models\HR;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class NurseBonusRun extends Model
{
    use SoftDeletes;

    protected $table = 'nurse_bonus_runs';

    protected $fillable = [
        'date', 'year', 'month', 'half', 'label', 'branch_id', 'employee_id', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** Хагас сарын эхлэх, дуусах огнооны Carbon-ыг буцаана */
    public function periodRange(): array
    {
        $start = \Carbon\Carbon::create($this->year, $this->month, $this->half === 'first' ? 1 : 16);
        $end   = $this->half === 'first'
            ? \Carbon\Carbon::create($this->year, $this->month, 15)
            : (clone $start)->endOfMonth();
        return [$start, $end];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(NurseBonusEntry::class, 'nurse_bonus_run_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getHalfLabelAttribute(): string
    {
        return $this->half === 'first' ? 'Сарын эхэн (1-15)' : 'Сарын сүүл (16-31)';
    }

    public function getTitleAttribute(): string
    {
        $months = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        $half = $this->half === 'first' ? 'эхэн' : 'сүүл';
        $base = "{$this->year} оны {$months[$this->month]}-р сар {$half}";
        $label = $this->label ? " · {$this->label}" : '';

        // Шинэ загвар: сувилагчийн нэр гарчигт орно
        if ($this->relationLoaded('employee') && $this->employee) {
            $name = trim($this->employee->last_name.' '.$this->employee->first_name);
            return "{$name} · {$base}{$label}";
        }

        return $base.$label;
    }
}
