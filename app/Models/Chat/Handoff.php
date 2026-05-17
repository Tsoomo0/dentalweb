<?php

namespace App\Models\Chat;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Handoff extends Model
{
    protected $table = 'chat_handoffs';

    public const STATUS_PENDING = 'pending';

    public const STATUS_ASSIGNED = 'assigned';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'bot_conversation_id',
        'user_id',
        'assigned_admin_id',
        'direct_conversation_id',
        'reason',
        'status',
        'assigned_at',
        'closed_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function botConversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'bot_conversation_id');
    }

    public function directConversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'direct_conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }
}
