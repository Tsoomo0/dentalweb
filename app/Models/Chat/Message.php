<?php

namespace App\Models\Chat;

use App\Models\Bot\BotNode;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use SoftDeletes;

    protected $table = 'chat_messages';

    public const SENDER_USER = 'user';

    public const SENDER_BOT = 'bot';

    public const SENDER_SYSTEM = 'system';

    public const TYPE_TEXT = 'text';

    public const TYPE_IMAGE = 'image';

    public const TYPE_FILE = 'file';

    public const TYPE_BOT_CARD = 'bot_card';

    public const TYPE_SYSTEM = 'system';

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'sender_type',
        'body',
        'type',
        'bot_node_id',
        'reply_to_id',
        'meta',
        'edited_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'edited_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function botNode(): BelongsTo
    {
        return $this->belongsTo(BotNode::class, 'bot_node_id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'message_id');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(MessageRead::class, 'message_id');
    }
}
