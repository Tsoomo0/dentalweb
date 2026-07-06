<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;

class SocialAiFaq extends Model
{
    protected $table = 'social_ai_faqs';

    protected $fillable = [
        'question',
        'answer',
        'is_active',
        'order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];
}
