<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollEntry extends Model
{
    protected $fillable = [
        'payroll_run_id', 'employee_id',
        'basic_salary', 'nd_salary', 'advance_salary', 'prev_paid', 'holiday_advance',
        'ath_bonus', 'percent_salary', 'overtime_bonus', 'reward', 'hazard_bonus', 'vacation_pay',
        'working_days', 'worked_days', 'daily_rate',
        'food_rate', 'food', 'milk_rate', 'milk', 'transport',
        'total_bonus', 'worked_salary', 'calc_salary', 'nd_total', 'ndsh',
        'tardy_minutes', 'tardiness', 'fingerprint_misses', 'no_fingerprint',
        'other_deduction', 'total_deduction',
        'income_tax', 'net_hand', 'hand_deduction', 'bank_salary',
        'is_sent', 'sent_at',
    ];

    protected $casts = [
        'basic_salary' => 'float', 'nd_salary' => 'float', 'advance_salary' => 'float',
        'prev_paid' => 'float', 'holiday_advance' => 'float',
        'ath_bonus' => 'float', 'percent_salary' => 'float', 'overtime_bonus' => 'float',
        'reward' => 'float', 'hazard_bonus' => 'float', 'vacation_pay' => 'float',
        'daily_rate' => 'float',
        'food_rate' => 'float', 'food' => 'float',
        'milk_rate' => 'float', 'milk' => 'float', 'transport' => 'float',
        'total_bonus' => 'float', 'worked_salary' => 'float', 'calc_salary' => 'float',
        'nd_total' => 'float', 'ndsh' => 'float',
        'tardy_minutes' => 'float', 'tardiness' => 'float',
        'fingerprint_misses' => 'float', 'no_fingerprint' => 'float',
        'other_deduction' => 'float', 'total_deduction' => 'float',
        'income_tax' => 'float', 'net_hand' => 'float',
        'hand_deduction' => 'float', 'bank_salary' => 'float',
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
