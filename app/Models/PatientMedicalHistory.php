<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientMedicalHistory extends Model
{
    protected $fillable = [
        'patient_id',
        // Treat-08 өвчнүүд
        'has_heart_disease', 'has_diabetes', 'has_hypertension', 'has_hepatitis',
        'has_bleeding_disorder', 'has_asthma', 'has_epilepsy', 'has_kidney_disease',
        'has_hiv', 'has_mental_disorder', 'has_cancer', 'is_cancer_treatment',
        'has_thyroid_disorder', 'has_anemia', 'takes_blood_thinners',
        'has_tuberculosis', 'has_infectious_hepatitis', 'has_tonsils',
        'is_pregnant', 'is_nursing', 'has_womens_condition',
        'is_smoker', 'drinks_alcohol',
        'other_conditions', 'organ_stones',
        // Харшил
        'allergy_penicillin', 'allergy_aspirin', 'allergy_latex',
        'allergy_anesthetic', 'had_anesthetic_allergy', 'allergy_other',
        // Эм, эмчилгээ
        'current_medications', 'special_ongoing_treatment',
        // Өмнөх эмчилгээ
        'had_dental_complications', 'dental_complication_detail',
        'previous_surgeries', 'previous_dental_treatments',
        'last_checkup', 'previous_dental_clinics',
        'updated_by',
    ];

    protected $casts = [
        'has_heart_disease' => 'boolean',
        'has_diabetes' => 'boolean',
        'has_hypertension' => 'boolean',
        'has_hepatitis' => 'boolean',
        'has_bleeding_disorder' => 'boolean',
        'has_asthma' => 'boolean',
        'has_epilepsy' => 'boolean',
        'has_kidney_disease' => 'boolean',
        'has_hiv' => 'boolean',
        'has_mental_disorder' => 'boolean',
        'has_cancer' => 'boolean',
        'is_cancer_treatment' => 'boolean',
        'has_thyroid_disorder' => 'boolean',
        'has_anemia' => 'boolean',
        'takes_blood_thinners' => 'boolean',
        'has_tuberculosis' => 'boolean',
        'has_infectious_hepatitis' => 'boolean',
        'has_tonsils' => 'boolean',
        'is_pregnant' => 'boolean',
        'is_nursing' => 'boolean',
        'has_womens_condition' => 'boolean',
        'is_smoker' => 'boolean',
        'drinks_alcohol' => 'boolean',
        'allergy_penicillin' => 'boolean',
        'allergy_aspirin' => 'boolean',
        'allergy_latex' => 'boolean',
        'allergy_anesthetic' => 'boolean',
        'had_anesthetic_allergy' => 'boolean',
        'had_dental_complications' => 'boolean',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
