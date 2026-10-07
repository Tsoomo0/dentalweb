<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    protected $fillable = [
        'name', 'type', 'address', 'phone', 'image',
        'description', 'doctor_count', 'is_featured',
        'is_active', 'is_public', 'order', 'lat', 'lng', 'radius_m', 'attendance_gps_enabled',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'lat' => 'float',
        'lng' => 'float',
        'radius_m' => 'integer',
        'attendance_gps_enabled' => 'boolean',
    ];

    /**
     * Нийтийн сайт болон онлайн цаг захиалгад харагдах салбарууд — идэвхтэй бөгөөд
     * админ «Нийтийн сайтад харуулах»-ыг асаасан (оффис гэх мэт дотоод байршлыг нууна).
     */
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_active', true)->where('is_public', true);
    }

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
