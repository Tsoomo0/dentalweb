<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkSchedule extends Model
{
    use SoftDeletes;

    protected $table = 'employee_work_schedules';

    protected $fillable = [
        'employee_id', 'date', 'shift_type',
        'start_time', 'end_time', 'room',
        'assigned_doctor_id', 'notes', 'created_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function assignedDoctor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_doctor_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getShiftLabelAttribute(): string
    {
        return match ($this->shift_type) {
            'morning'   => 'Өглөөний ээлж',
            'afternoon' => 'Өдрийн ээлж',
            'full'      => 'Бүтэн өдөр',
            'off'       => 'Амралт',
            default     => $this->shift_type,
        };
    }
}
