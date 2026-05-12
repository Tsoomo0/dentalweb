<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientConsentForm extends Model
{
    protected $fillable = [
        'patient_id',
        'template_id',
        'appointment_id',
        'signer_name',
        'patient_signature',
        'guardian_name',
        'guardian_signature',
        'signed_at',
        'created_by',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s\Z');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ConsentFormTemplate::class, 'template_id');
    }
}
