<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'appointment_number',
        'patient_id',
        'patient_name',
        'patient_phone',
        'patient_email',
        'doctor_id',
        'branch_id',
        'service',
        'type',
        'online_slot_id',
        'appointment_date',
        'appointment_time',
        'appointment_time_end',
        'status',
        'notes',
        'admin_notes',
        'payment_status',
        'payment_amount',
        'qpay_invoice_id',
        'meet_link',
        'created_by',
        'confirmed_by',
        'created_by_id',
        'confirmed_by_id',
    ];

    protected $casts = [
        'appointment_date'  => 'date:Y-m-d',
        'payment_amount'    => 'integer',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function treatmentRecord(): HasOne
    {
        return $this->hasOne(TreatmentRecord::class);
    }

    public function createdBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by_id');
    }

    public function confirmedBy(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'confirmed_by_id');
    }

    /** APT-0001 форматтай дугаар үүсгэх */
    public static function generateNumber(): string
    {
        $max = static::withTrashed()
            ->selectRaw("MAX(CAST(SUBSTRING(appointment_number, 5) AS UNSIGNED)) as n")
            ->value('n') ?? 0;
        return 'APT-' . str_pad($max + 1, 4, '0', STR_PAD_LEFT);
    }

    public function getFormattedDateAttribute(): string
    {
        return $this->appointment_date?->format('Y оны m сарын d') ?? '—';
    }

    /**
     * patient_id байвал patient-аас patient_name/phone/email автоматаар синк хийнэ.
     * Ингэснээр appointments дахь өгөгдөл үргэлж patients хүснэгттэй нийцнэ.
     */
    protected static function booted(): void
    {
        static::saving(function (Appointment $appointment) {
            if (! $appointment->patient_id) {
                return;
            }

            $patient = $appointment->relationLoaded('patient')
                ? $appointment->patient
                : Patient::find($appointment->patient_id);

            if (! $patient) {
                return;
            }

            $appointment->patient_name  = $patient->full_name;
            $appointment->patient_phone = $patient->phone;
            $appointment->patient_email = $patient->email;
        });
    }
}
