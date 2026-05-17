<?php

namespace App\Models\HR;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollRun extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'year', 'month', 'half', 'label', 'status', 'notes', 'created_by', 'branch_id',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(PayrollEntry::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getHalfLabelAttribute(): string
    {
        return $this->half === 'first' ? 'Эхний цалин (1-15)' : 'Сүүл цалин (16-31)';
    }

    public function getTitleAttribute(): string
    {
        $months = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        $half = $this->half === 'first' ? 'эхний' : 'сүүл';
        $label = $this->label ? " · {$this->label}" : '';

        return "{$this->year} оны {$months[$this->month]}-р сар {$half} цалин{$label}";
    }
}
