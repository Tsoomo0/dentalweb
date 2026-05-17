<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DailySheetEntry extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'daily_sheet_id',
        'user_id',
        'source',
        'row_order',
        'patient_name',
        'gender',
        'diagnosis',
        'appointment_number',
        'appointment_id',
        'gross_amount',
        'discount',
        'mobile_amount',
        'card_amount',
        'cash_amount',
        'storepay_amount',
        'total_amount',
        'outstanding_amount',
        'outstanding_paid_at',
        'outstanding_paid_receipt',
        'outstanding_paid_method',
        'outstanding_paid_amount',
        'doctor_id',
        'technician_employee_id',
        'supply_orthodontic_brush',
        'supply_interdental_brush',
        'supply_dental_floss',
        'supply_wax',
        'supply_retainer_case',
        'supply_removable_app_case',
        'entry_notes',
        'is_morning_entry',
        'overpaid_amount',
        'overpaid_used_at',
        'overpaid_used_receipt',
        'overpaid_used_method',
        'overpaid_used_amount',
        'refund_amount',
        'refunded_at',
        'refund_method',
        'refund_reason',
        'refunded_by',
    ];

    protected $casts = [
        'gross_amount' => 'integer',
        'discount' => 'integer',
        'total_amount' => 'integer',
        'cash_amount' => 'integer',
        'card_amount' => 'integer',
        'storepay_amount' => 'integer',
        'mobile_amount' => 'integer',
        'outstanding_amount' => 'integer',
        'outstanding_paid_at' => 'datetime',
        'outstanding_paid_amount' => 'integer',
        'supply_orthodontic_brush' => 'integer',
        'supply_interdental_brush' => 'integer',
        'supply_dental_floss' => 'integer',
        'supply_wax' => 'integer',
        'supply_retainer_case' => 'integer',
        'supply_removable_app_case' => 'integer',
        'is_morning_entry' => 'boolean',
        'overpaid_amount' => 'integer',
        'overpaid_used_at' => 'datetime',
        'overpaid_used_amount' => 'integer',
        'refund_amount' => 'integer',
        'refunded_at' => 'datetime',
    ];

    public function dailySheet(): BelongsTo
    {
        return $this->belongsTo(DailySheet::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
