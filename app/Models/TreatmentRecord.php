<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreatmentRecord extends Model
{
    protected $fillable = [
        'patient_id',
        'appointment_id',
        'doctor_id',
        'treatment_type',
        'tooth_numbers',
        'chief_complaint',
        'clinical_findings',
        'treatment_performed',
        'tools_materials',
        'next_appointment_plan',
        'doctor_notes',
        'amount_charged',
        'doctor_signature',
        'patient_signature',
        'record_date',
        'services',
        'payment_status',
        'payment_method',
        'paid_amount',
        'payment_note',
        'discount_percent',
        'discount_amount',
        'paid_at',
        'paid_by_id',
        'qpay_invoice_id',
    ];

    protected $casts = [
        'record_date'    => 'date:Y-m-d',
        'amount_charged' => 'integer',
        'paid_at'        => 'datetime',
        'services'       => 'array',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'paid_by_id');
    }

    public function leasingPlan(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(LeasingPlan::class);
    }
}
