<?php

namespace App\Models;

use App\Models\HR\Employee;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Doctor extends Authenticatable
{
    use Notifiable, SoftDeletes;

    protected $fillable = [
        'employee_id', 'branch_id', 'name', 'specialization', 'degree',
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

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
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
            if ($doctor->branch_id) {
                $doctor->branches()->syncWithoutDetaching([$doctor->branch_id]);
                $doctor->branch?->updateDoctorCount();
            }
        });

        static::updated(function ($doctor) {
            if ($doctor->isDirty('branch_id')) {
                // Шинэ үндсэн салбарыг pivot-д нэмнэ (хуучныг устгахгүй)
                if ($doctor->branch_id) {
                    $doctor->branches()->syncWithoutDetaching([$doctor->branch_id]);
                }
                Branch::find($doctor->getOriginal('branch_id'))?->updateDoctorCount();
            }

            if ($doctor->isDirty('is_active') || $doctor->isDirty('branch_id')) {
                $doctor->branch?->updateDoctorCount();
            }
        });

        static::deleted(function ($doctor) {
            $doctor->branch?->updateDoctorCount();
        });
    }
}
