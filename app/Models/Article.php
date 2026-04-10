<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'content',
        'excerpt',
        'featured_image',
        'category',
        'status',
        'views',
        'published_at',
        'order',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'views'        => 'integer',
    ];
}
