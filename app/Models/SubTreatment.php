<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubTreatment extends Model
{
    protected $fillable = [
        'treatment_id', 'title', 'description',
        'price_min', 'price_max', 'duration_min',
        'is_active', 'order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price_min' => 'decimal:2',
        'price_max' => 'decimal:2',
    ];

    public function treatment(): BelongsTo
    {
        return $this->belongsTo(Treatment::class);
    }
}
