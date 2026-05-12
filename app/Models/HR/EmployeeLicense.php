<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeLicense extends Model
{
    protected $fillable = [
        'employee_id', 'name', 'issuer', 'file_path',
        'start_date', 'end_date', 'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (!$this->end_date) return null;
        return now()->diffInDays($this->end_date, false);
    }
}
