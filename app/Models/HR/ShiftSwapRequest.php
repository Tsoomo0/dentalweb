<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ээлж шилжүүлэх (target_shift_id хоосон) эсвэл солилцох хүсэлт.
 * Урсгал: pending_peer → (хамт ажилтан зөвшөөрнө) pending_approval → (HR) approved.
 */
class ShiftSwapRequest extends Model
{
    public const PENDING_PEER = 'pending_peer';

    public const PENDING_APPROVAL = 'pending_approval';

    public const APPROVED = 'approved';

    public const REJECTED = 'rejected';

    public const CANCELLED = 'cancelled';

    public const STATUS_LABELS = [
        self::PENDING_PEER => 'Хамт ажилтны хариу хүлээж буй',
        self::PENDING_APPROVAL => 'HR-ийн шийдвэр хүлээж буй',
        self::APPROVED => 'Зөвшөөрсөн',
        self::REJECTED => 'Татгалзсан',
        self::CANCELLED => 'Цуцалсан',
    ];

    protected $fillable = [
        'shift_id', 'requester_id', 'target_employee_id', 'target_shift_id', 'note',
        'status', 'peer_responded_at', 'decided_by', 'decided_at', 'rejection_reason',
    ];

    protected $casts = [
        'peer_responded_at' => 'datetime',
        'decided_at' => 'datetime',
    ];

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function targetShift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'target_shift_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'requester_id');
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'target_employee_id');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [self::PENDING_PEER, self::PENDING_APPROVAL], true);
    }

    public function isSwap(): bool
    {
        return $this->target_shift_id !== null;
    }
}
