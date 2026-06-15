<?php

namespace App\Models\Social;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialForm extends Model
{
    protected $table = 'social_forms';

    protected $fillable = [
        'name',
        'description',
        'fields',
        'success_message',
        'notify_emails',
        'is_active',
        'submissions_count',
        'created_by',
    ];

    protected $casts = [
        'fields' => 'array',
        'notify_emails' => 'array',
        'is_active' => 'boolean',
        'submissions_count' => 'integer',
    ];

    public function submissions(): HasMany
    {
        return $this->hasMany(SocialFormSubmission::class, 'social_form_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Контактыг формтой холбох энгийн токен. */
    public static function token(int $formId, int $contactId): string
    {
        return substr(hash_hmac('sha256', "form:{$formId}:contact:{$contactId}", (string) config('app.key')), 0, 32);
    }
}
