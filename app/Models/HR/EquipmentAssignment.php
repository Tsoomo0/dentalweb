<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentAssignment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'equipment_id', 'employee_id', 'assigned_by',
        'status', 'rejection_reason', 'notes',
        'accepted_at', 'returned_at',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function isReturned(): bool
    {
        return $this->status === 'returned';
    }
}
