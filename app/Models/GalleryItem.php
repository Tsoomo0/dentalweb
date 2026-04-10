<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GalleryItem extends Model
{
    protected $fillable = [
        'title',
        'description',
        'category_id',
        'before_image',
        'after_image',
        'is_featured',
        'is_active',
        'order',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_active'   => 'boolean',
        'order'       => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(TreatmentCategory::class, 'category_id');
    }
}
