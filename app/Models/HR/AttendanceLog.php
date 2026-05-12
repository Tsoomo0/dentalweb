<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    protected $fillable = [
        'employee_id', 'date', 'checked_in_at', 'checked_out_at', 'notes',
        'check_in_lat', 'check_in_lng', 'check_out_lat', 'check_out_lng',
    ];

    protected $casts = [
        'date'           => 'date',
        'checked_in_at'  => 'datetime',
        'checked_out_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function getWorkedMinutesAttribute(): int
    {
        if (!$this->checked_in_at || !$this->checked_out_at) return 0;
        return (int) $this->checked_in_at->diffInMinutes($this->checked_out_at);
    }
}
