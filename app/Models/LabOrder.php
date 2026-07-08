<?php

namespace App\Models;

use App\Models\HR\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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
        'lab_ready_date', 'arrived_date', 'pickup_date',
        'is_completed', 'completed_at',
        'payroll_counted', 'payroll_counted_at', 'payroll_counted_by',
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
        'payroll_counted'   => 'boolean',
        'payroll_counted_at' => 'datetime',
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

    /** Нугалсан ажилтнууд (олон) */
    public function benders(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'lab_order_employee', 'lab_order_id', 'employee_id')
            ->withPivotValue('role', 'bender')
            ->withTimestamps();
    }

    /** Өнгөлсөн ажилтнууд (олон) */
    public function polishers(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'lab_order_employee', 'lab_order_id', 'employee_id')
            ->withPivotValue('role', 'polisher')
            ->withTimestamps();
    }

    /** Хоёуланд ашиглах — нэрсийн массив */
    public static function employeeNames($collection): array
    {
        return $collection->map(fn ($e) => trim($e->last_name.' '.$e->first_name))->values()->all();
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
