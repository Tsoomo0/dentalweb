<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Treatment extends Model
{
    protected $fillable = [
        'treatment_category_id', 'title', 'description',
        'image', 'price_min', 'price_max', 'duration_min',
        'is_active', 'order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price_min' => 'decimal:2',
        'price_max' => 'decimal:2',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(TreatmentCategory::class, 'treatment_category_id');
    }

    public function subTreatments(): HasMany
    {
        return $this->hasMany(SubTreatment::class)->orderBy('order');
    }
}
