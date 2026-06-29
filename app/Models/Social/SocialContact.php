<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SocialContact extends Model
{
    protected $table = 'social_contacts';

    protected $fillable = [
        'social_account_id',
        'channel',
        'external_id',
        'name',
        'username',
        'gender',
        'avatar',
        'last_interacted_at',
        'meta',
        'attributes',
        'tags',
    ];

    protected $casts = [
        'last_interacted_at' => 'datetime',
        'meta' => 'array',
        'attributes' => 'array',
        'tags' => 'array',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class, 'social_account_id');
    }

    public function conversation(): HasOne
    {
        return $this->hasOne(SocialConversation::class, 'social_contact_id');
    }

    public function displayName(): string
    {
        if ($this->name) {
            return $this->name;
        }
        if ($this->username) {
            return '@'.$this->username;
        }

        // Жинхэнэ нэр Meta-гаас ирээгүй бол (App Review хэрэгтэй) — цэвэр fallback.
        return 'Зочин ····'.mb_substr((string) $this->external_id, -4);
    }
}
