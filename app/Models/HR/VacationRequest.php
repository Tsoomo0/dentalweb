<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class VacationRequest extends Model
{
    use SoftDeletes;

    protected $table = 'vacation_requests';

    protected $fillable = [
        'employee_id', 'start_date', 'end_date',
        'replacement_employee_id', 'location_during_leave',
        'emergency_phone', 'had_annual_leave_this_year',
        'reason', 'status', 'rejection_reason',
        'reviewed_by', 'reviewed_at',
    ];

    protected $casts = [
        'start_date'                 => 'date',
        'end_date'                   => 'date',
        'had_annual_leave_this_year' => 'boolean',
        'reviewed_at'                => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function replacement(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'replacement_employee_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function getDaysAttribute(): int
    {
        $days    = 0;
        $current = $this->start_date->copy();
        while ($current->lte($this->end_date)) {
            if ($current->isWeekday()) {
                $days++;
            }
            $current->addDay();
        }
        return $days;
    }

    public function isPending(): bool  { return $this->status === 'pending'; }
    public function isApproved(): bool { return $this->status === 'approved'; }
    public function isRejected(): bool { return $this->status === 'rejected'; }
}
