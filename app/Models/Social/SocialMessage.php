<?php

namespace App\Models\Social;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialMessage extends Model
{
    protected $table = 'social_messages';

    public const DIR_IN = 'in';

    public const DIR_OUT = 'out';

    public const SENDER_CONTACT = 'contact';

    public const SENDER_AGENT = 'agent';

    public const SENDER_BOT = 'bot';

    public const SENDER_AI = 'ai';

    protected $fillable = [
        'social_conversation_id',
        'flow_node_id',
        'direction',
        'sender',
        'type',
        'text',
        'attachments',
        'external_mid',
        'sent_by_user_id',
        'delivered_at',
        'read_at',
    ];

    protected $casts = [
        'attachments' => 'array',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(SocialConversation::class, 'social_conversation_id');
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }
}
