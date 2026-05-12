<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class Patient extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'patient_number',
        'last_name',
        'first_name',
        'gender',
        'date_of_birth',
        'register_number',
        'phone',
        'phone2',
        'email',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
        'branch_id',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function medicalHistory(): HasOne
    {
        return $this->hasOne(PatientMedicalHistory::class);
    }

    public function orthoAssessment(): HasOne
    {
        return $this->hasOne(PatientOrthoAssessment::class);
    }

    public function orthoVisits(): HasMany
    {
        return $this->hasMany(OrthoVisit::class)->orderByDesc('visit_date');
    }

    public function generalVisits(): HasMany
    {
        return $this->hasMany(GeneralVisit::class)->orderByDesc('visit_date');
    }

    public function orthoMedia(): HasMany
    {
        return $this->hasMany(OrthoMedia::class)->orderBy('created_at');
    }

    public function consentForms(): HasMany
    {
        return $this->hasMany(PatientConsentForm::class);
    }

    public function treatmentRecords(): HasMany
    {
        return $this->hasMany(TreatmentRecord::class)->orderByDesc('record_date');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function getFullNameAttribute(): string
    {
        return $this->last_name . ' ' . $this->first_name;
    }

    public function getAgeAttribute(): ?int
    {
        return $this->date_of_birth?->age;
    }

    public static function generateNumber(): string
    {
        $max = static::withTrashed()
            ->selectRaw("MAX(CAST(SUBSTRING(patient_number, 4) AS UNSIGNED)) as n")
            ->value('n') ?? 0;
        return 'PT-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
    }
}
