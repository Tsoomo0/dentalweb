<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    protected $fillable = [
        'name', 'type', 'address', 'phone', 'image',
        'description', 'doctor_count', 'is_featured',
        'is_active', 'order',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_active'   => 'boolean',
    ];

    /**
     * Салбарт ажилладаг эмчүүдийн харилцаа
     */
    public function doctors(): HasMany
    {
        return $this->hasMany(Doctor::class);
    }

    /**
     * Салбарт ажилладаг идэвхтэй эмчдийн тоо
     */
    public function getActiveDoctorsCount(): int
    {
        return $this->doctors()->where('is_active', true)->count();
    }

    /**
     * Салбарт ажилладаг бүх эмчдийн тоо
     */
    public function getAllDoctorsCount(): int
    {
        return $this->doctors()->count();
    }

    /**
     * Эмчдийн тоог синхрончло
     */
    public function updateDoctorCount(): void
    {
        $this->update([
            'doctor_count' => $this->getActiveDoctorsCount(),
        ]);
    }
}
