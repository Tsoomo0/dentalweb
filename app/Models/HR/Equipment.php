<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Equipment extends Model
{
    use SoftDeletes;

    protected $table = 'equipment';

    protected $fillable = [
        'name', 'serial_number', 'brand', 'model',
        'condition', 'category', 'description', 'notes',
        'purchased_at', 'status',
    ];

    protected $casts = [
        'purchased_at' => 'date',
    ];

    public function assignments(): HasMany
    {
        return $this->hasMany(EquipmentAssignment::class);
    }

    public function activeAssignment(): HasOne
    {
        return $this->hasOne(EquipmentAssignment::class)->where('status', 'accepted');
    }

    public function pendingAssignment(): HasOne
    {
        return $this->hasOne(EquipmentAssignment::class)->where('status', 'pending');
    }

    public function getConditionLabelAttribute(): string
    {
        return match ($this->condition) {
            'new' => 'Шинэ',
            'good' => 'Сайн',
            'fair' => 'Хэвийн',
            'poor' => 'Муу',
            'damaged' => 'Эвдэрсэн',
            default => $this->condition,
        };
    }
}
