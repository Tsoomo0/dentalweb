<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TreatmentCategory extends Model
{
    protected $fillable = ['name', 'icon', 'order', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function treatments(): HasMany
    {
        return $this->hasMany(Treatment::class)->orderBy('order');
    }
}
