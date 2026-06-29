<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialBroadcastRecipient extends Model
{
    protected $table = 'social_broadcast_recipients';

    public const STATUS_PENDING = 'pending';

    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'social_broadcast_id',
        'social_contact_id',
        'status',
        'error',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function broadcast(): BelongsTo
    {
        return $this->belongsTo(SocialBroadcast::class, 'social_broadcast_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(SocialContact::class, 'social_contact_id');
    }
}
