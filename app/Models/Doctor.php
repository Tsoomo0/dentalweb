<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Doctor extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'branch_id', 'name', 'specialization', 'degree',
        'experience_years', 'experiences', 'photo',
        'description', 'phone', 'email', 'password',
        'online_slots', 'has_online_booking', 'is_active', 'order',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active'            => 'boolean',
        'has_online_booking'   => 'boolean',
        'experiences'      => 'array',
        'online_slots'     => 'array',
        'experience_years' => 'integer',
        'password'         => 'hashed',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** Энэ эмчийн ахлах эмч нар (pivot: doctor_senior) */
    public function seniorDoctors(): BelongsToMany
    {
        return $this->belongsToMany(Doctor::class, 'doctor_senior', 'doctor_id', 'senior_id');
    }

    /** Энэ эмчийн харьяа туслах эмч нар */
    public function assistantDoctors(): BelongsToMany
    {
        return $this->belongsToMany(Doctor::class, 'doctor_senior', 'senior_id', 'doctor_id');
    }

    /** Эмч ажиллах бүх салбарууд (many-to-many) */
    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'branch_doctor');
    }

    protected static function booted(): void
    {
        static::created(function ($doctor) {
            if ($doctor->branch) {
                $doctor->branch->updateDoctorCount();
            }
        });

        static::updated(function ($doctor) {
            if ($doctor->isDirty('is_active') || $doctor->isDirty('branch_id')) {
                if ($doctor->branch) {
                    $doctor->branch->updateDoctorCount();
                }
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
