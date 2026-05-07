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
        'row_order',
        'patient_name',
        'gender',
        'diagnosis',
        'appointment_number',
        'discount',
        'mobile_amount',
        'card_amount',
        'cash_amount',
        'storepay_amount',
        'total_amount',
        'outstanding_amount',
        'outstanding_paid_at',
        'doctor_id',
    ];

    protected $casts = [
        'discount'             => 'integer',
        'total_amount'         => 'integer',
        'cash_amount'          => 'integer',
        'card_amount'          => 'integer',
        'storepay_amount'      => 'integer',
        'mobile_amount'        => 'integer',
        'outstanding_amount'   => 'integer',
        'outstanding_paid_at'  => 'datetime',
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
        return $this->belongsTo(\App\Models\User::class);
    }
}
