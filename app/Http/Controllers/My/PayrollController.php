<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\PayrollEntry;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (!$employee) return redirect()->route('portal.select');

        $entries = PayrollEntry::with('run')
            ->where('employee_id', $employee->id)
            ->where('is_sent', true)
            ->orderByDesc('payroll_run_id')
            ->get()
            ->filter(fn($e) => $e->run !== null)  // soft-deleted run-уудыг алгасах
            ->values()
            ->map(fn($e) => [
                'id'              => $e->id,
                'run_id'          => $e->payroll_run_id,
                'run_title'       => $e->run->title,
                'half_label'      => $e->run->half_label,
                'year'            => $e->run->year,
                'month'           => $e->run->month,
                'basic_salary'    => $e->basic_salary,
                'nd_salary'       => $e->nd_salary,
                'prev_paid'       => $e->prev_paid,
                'holiday_advance' => $e->holiday_advance,
                'ath_bonus'       => $e->ath_bonus,
                'overtime_bonus'  => $e->overtime_bonus,
                'vacation_pay'    => $e->vacation_pay,
                'working_days'    => $e->working_days,
                'worked_days'     => $e->worked_days,
                'daily_rate'      => $e->daily_rate,
                'food'            => $e->food,
                'transport'       => $e->transport,
                'milk'            => $e->milk,
                'total_bonus'     => $e->total_bonus,
                'calc_salary'     => $e->calc_salary,
                'nd_total'        => $e->nd_total,
                'ndsh'            => $e->ndsh,
                'tardiness'       => $e->tardiness,
                'no_fingerprint'  => $e->no_fingerprint,
                'other_deduction' => $e->other_deduction,
                'income_tax'      => $e->income_tax ?? 0,
                'net_hand'        => $e->net_hand,
                'bank_salary'     => $e->bank_salary,
            ]);

        return Inertia::render('my/payroll', [
            'employee' => [
                'full_name'       => $employee->full_name,
                'employee_number' => $employee->employee_number,
                'position'        => $employee->position?->name,
                'bank_account'    => $employee->bank_account,
                'bank_name'       => $employee->bank_name,
                'photo_url'       => $employee->photo_url,
                'initials'        => mb_substr($employee->last_name ?? '', 0, 1) . mb_substr($employee->first_name ?? '', 0, 1),
            ],
            'entries' => $entries,
        ]);
    }
}
