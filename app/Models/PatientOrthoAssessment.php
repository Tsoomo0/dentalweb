<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientOrthoAssessment extends Model
{
    protected $fillable = ['patient_id', 'doctor_id', 'data', 'created_by'];

    protected $casts = ['data' => 'array'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
