<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Doctor extends Model
{
    protected $fillable = [
        'branch_id', 'name', 'specialization', 'degree',
        'experience_years', 'experiences', 'photo',
        'description', 'phone', 'email', 'is_active', 'order',
    ];

    protected $casts = [
        'is_active'        => 'boolean',
        'experiences'      => 'array',
        'experience_years' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Хос дүрмүүд - эмч үүсэх үед эмчүүдийн тоо синхрончлогдоно
     */
    protected static function booted(): void
    {
        static::created(function ($doctor) {
            if ($doctor->branch) {
                $doctor->branch->updateDoctorCount();
            }
        });

        static::updated(function ($doctor) {
            // Статус өөрчлөгдөөс олон салбар сольж болох учираас хэмжээ өновчлөнө
            if ($doctor->isDirty('is_active') || $doctor->isDirty('branch_id')) {
                if ($doctor->branch) {
                    $doctor->branch->updateDoctorCount();
                }
                // Хэрвээ салбар сольсон бол өндөр салбарыг найруулна
                if ($doctor->isDirty('branch_id')) {
                    Branch::find($doctor->getOriginal('branch_id'))?->updateDoctorCount();
                }
            }
        });

        static::deleted(function ($doctor) {
            if ($doctor->branch) {
                $doctor->branch->updateDoctorCount();
            }
        });
    }
}

