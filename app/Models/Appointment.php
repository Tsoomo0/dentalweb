<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    protected $fillable = [
        'appointment_number',
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
    ];

    protected $casts = [
        'appointment_date'  => 'date:Y-m-d',
        'payment_amount'    => 'integer',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** APT-0001 форматтай дугаар үүсгэх */
    public static function generateNumber(): string
    {
        $last = static::max('id') ?? 0;
        return 'APT-' . str_pad($last + 1, 4, '0', STR_PAD_LEFT);
    }

    public function getFormattedDateAttribute(): string
    {
        return $this->appointment_date?->format('Y оны m сарын d') ?? '—';
    }
}
