<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeasingPlan extends Model
{
    protected $fillable = [
        'treatment_record_id',
        'patient_id',
        'total_amount',
        'months',
        'monthly_amount',
        'paid_months',
        'qpay_invoice_id',
        'created_by_id',
    ];

    protected $casts = [
        'total_amount'   => 'integer',
        'months'         => 'integer',
        'monthly_amount' => 'integer',
        'paid_months'    => 'integer',
    ];

    public function treatmentRecord(): BelongsTo
    {
        return $this->belongsTo(TreatmentRecord::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(LeasingInstallment::class)->orderBy('installment_number');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function getRemainingMonthsAttribute(): int
    {
        return $this->months - $this->paid_months;
    }

    public function getRemainingAmountAttribute(): int
    {
        return $this->total_amount - ($this->paid_months * $this->monthly_amount);
    }
}
