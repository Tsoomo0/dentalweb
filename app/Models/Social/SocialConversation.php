<?php

namespace App\Models\Social;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialConversation extends Model
{
    protected $table = 'social_conversations';

    public const STATUS_BOT = 'bot';

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'social_account_id',
        'social_contact_id',
        'channel',
        'status',
        'awaiting_node_id',
        'assigned_user_id',
        'last_message_text',
        'last_message_at',
        'unread_count',
        'window_expires_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'window_expires_at' => 'datetime',
        'unread_count' => 'integer',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class, 'social_account_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(SocialContact::class, 'social_contact_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SocialMessage::class, 'social_conversation_id');
    }

    /** Meta 24-цагийн messaging window нээлттэй эсэх. */
    public function windowOpen(): bool
    {
        return $this->window_expires_at !== null && $this->window_expires_at->isFuture();
    }
}
