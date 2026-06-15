<?php

namespace App\Models\Social;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialAccount extends Model
{
    protected $table = 'social_accounts';

    protected $fillable = [
        'page_id',
        'page_name',
        'page_access_token',
        'token_expires_at',
        'ig_id',
        'ig_username',
        'avatar',
        'is_active',
        'webhook_subscribed',
        'connected_by',
        'meta',
    ];

    protected $casts = [
        'page_access_token' => 'encrypted',
        'token_expires_at' => 'datetime',
        'is_active' => 'boolean',
        'webhook_subscribed' => 'boolean',
        'meta' => 'array',
    ];

    protected $hidden = [
        'page_access_token',
    ];

    public function connectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'connected_by');
    }
}
