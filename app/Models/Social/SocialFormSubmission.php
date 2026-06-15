<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialFormSubmission extends Model
{
    protected $table = 'social_form_submissions';

    protected $fillable = [
        'social_form_id',
        'social_contact_id',
        'social_conversation_id',
        'data',
        'submitted_at',
    ];

    protected $casts = [
        'data' => 'array',
        'submitted_at' => 'datetime',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(SocialForm::class, 'social_form_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(SocialContact::class, 'social_contact_id');
    }
}
