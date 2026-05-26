<?php

namespace App\Models;

use App\Models\HR\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'order_date', 'sent_to_lab_date', 'lab_name',
        'patient_last_name', 'patient_first_name', 'patient_phone',
        'branch_id', 'doctor_id',
        'work_description',
        'amount_due', 'discount_percent', 'amount_paid',
        'final_payment_receipt', 'final_payment_method', 'final_payment_at',
        'bender_employee_id', 'polisher_employee_id',
        'lab_ready_date', 'arrived_date', 'pickup_date',
        'is_completed', 'completed_at',
        'notes', 'created_by',
    ];

    protected $casts = [
        'order_date'        => 'date:Y-m-d',
        'sent_to_lab_date'  => 'date:Y-m-d',
        'lab_ready_date'    => 'date:Y-m-d',
        'arrived_date'      => 'date:Y-m-d',
        'pickup_date'       => 'date:Y-m-d',
        'final_payment_at'  => 'datetime',
        'completed_at'      => 'datetime',
        'is_completed'      => 'boolean',
        'amount_due'        => 'integer',
        'discount_percent'  => 'integer',
        'amount_paid'       => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function bender(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'bender_employee_id');
    }

    public function polisher(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'polisher_employee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getPatientNameAttribute(): string
    {
        return trim(($this->patient_last_name ?? '').' '.$this->patient_first_name);
    }

    /** Хөнгөлөлт хасагдсаны дараах төлөх дүн */
    public function getEffectiveDueAttribute(): int
    {
        $due = (int) $this->amount_due;
        $pct = max(0, min(100, (int) $this->discount_percent));
        return (int) round($due * (100 - $pct) / 100);
    }

    public function getOutstandingAmountAttribute(): int
    {
        return max(0, $this->effective_due - (int) $this->amount_paid);
    }
}
