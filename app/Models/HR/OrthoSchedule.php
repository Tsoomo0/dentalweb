<?php

namespace App\Models\HR;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrthoSchedule extends Model
{
    protected $fillable = [
        'employee_id', 'date', 'state',
        'branch_id', 'assigned_doctor_id', 'note', 'created_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    /** Боломжит төлөвүүд (Excel дэх кодууд). */
    public const STATES = [
        'work'     => 'Ажиллах',
        'warehouse' => 'Агуулах',
        'off'      => 'Амралт',
        'vacation' => 'Ээлжийн амралт',
        'holiday'  => 'Наадам / Баяр',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function assignedDoctor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_doctor_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
