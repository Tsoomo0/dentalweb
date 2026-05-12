<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeasingInstallment extends Model
{
    protected $fillable = [
        'leasing_plan_id',
        'installment_number',
        'due_date',
        'payment_method',
        'amount',
        'paid_at',
        'paid_by_id',
        'notes',
    ];

    protected $casts = [
        'amount'   => 'integer',
        'due_date' => 'date',
        'paid_at'  => 'datetime',
    ];

    public function leasingPlan(): BelongsTo
    {
        return $this->belongsTo(LeasingPlan::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by_id');
    }
}
