<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollEntry extends Model
{
    protected $fillable = [
        'payroll_run_id', 'employee_id',
        'basic_salary', 'nd_salary', 'prev_paid', 'holiday_advance',
        'ath_bonus', 'overtime_bonus', 'vacation_pay',
        'working_days', 'worked_days', 'daily_rate',
        'food', 'transport', 'milk',
        'total_bonus', 'calc_salary', 'nd_total', 'ndsh',
        'tardiness', 'no_fingerprint', 'other_deduction',
        'income_tax', 'net_hand', 'bank_salary',
        'is_sent', 'sent_at',
    ];

    protected $casts = [
        'basic_salary' => 'float', 'nd_salary' => 'float',
        'prev_paid' => 'float', 'holiday_advance' => 'float',
        'ath_bonus' => 'float', 'overtime_bonus' => 'float', 'vacation_pay' => 'float',
        'daily_rate' => 'float',
        'food' => 'float', 'transport' => 'float', 'milk' => 'float',
        'total_bonus' => 'float', 'calc_salary' => 'float',
        'nd_total' => 'float', 'ndsh' => 'float',
        'tardiness' => 'float', 'no_fingerprint' => 'float', 'other_deduction' => 'float',
        'income_tax' => 'float', 'net_hand' => 'float', 'bank_salary' => 'float',
        'is_sent' => 'boolean', 'sent_at' => 'datetime',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
