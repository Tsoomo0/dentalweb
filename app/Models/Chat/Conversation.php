<?php

namespace App\Models\Chat;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Conversation extends Model
{
    use SoftDeletes;

    protected $table = 'chat_conversations';

    public const TYPE_DIRECT = 'direct';
    public const TYPE_GROUP  = 'group';
    public const TYPE_BOT    = 'bot';

    protected $fillable = [
        'type',
        'name',
        'avatar',
        'created_by',
        'last_message_id',
        'last_message_at',
        'meta',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'meta'            => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(Participant::class, 'conversation_id');
    }

    public function activeParticipants(): HasMany
    {
        return $this->hasMany(Participant::class, 'conversation_id')->whereNull('left_at');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'chat_participants',
            'conversation_id',
            'user_id'
        )->withPivot(['role', 'last_read_at', 'muted_until', 'is_pinned', 'joined_at', 'left_at'])
            ->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversation_id');
    }

    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    public function scopeForUser(Builder $q, int $userId): Builder
    {
        return $q->whereHas('participants', function (Builder $sub) use ($userId) {
            $sub->where('user_id', $userId)->whereNull('left_at');
        });
    }

    public function isDirect(): bool { return $this->type === self::TYPE_DIRECT; }
    public function isGroup(): bool  { return $this->type === self::TYPE_GROUP; }
    public function isBot(): bool    { return $this->type === self::TYPE_BOT; }
}
