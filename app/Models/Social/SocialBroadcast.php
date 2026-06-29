<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialBroadcast extends Model
{
    protected $table = 'social_broadcasts';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SENDING = 'sending';

    public const STATUS_DONE = 'done';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'social_account_id',
        'name',
        'text',
        'image_url',
        'button_label',
        'button_url',
        'filters',
        'status',
        'total',
        'sent_count',
        'failed_count',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'filters' => 'array',
        'total' => 'integer',
        'sent_count' => 'integer',
        'failed_count' => 'integer',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class, 'social_account_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(SocialBroadcastRecipient::class, 'social_broadcast_id');
    }
}
