<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\PayrollEntry;
use App\Support\Payroll\PayrollSchema;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return redirect()->route('portal.select');
        }

        $entries = PayrollEntry::with('run')
            ->where('employee_id', $employee->id)
            ->where('is_sent', true)
            ->orderByDesc('payroll_run_id')
            ->get()
            ->filter(fn ($e) => $e->run !== null)  // soft-deleted run-уудыг алгасах
            ->values()
            ->map(fn ($e) => array_merge(
                // Задаргааг тухайн тооцооны хагасын схемээр бодно —
                // эхэн болон сүүл цалин өөр өөр баганатай
                PayrollSchema::compute($e->toArray(), $e->run->half),
                [
                    'id' => $e->id,
                    'run_id' => $e->payroll_run_id,
                    'run_title' => $e->run->title,
                    'half' => $e->run->half,
                    'half_label' => $e->run->half_label,
                    'year' => $e->run->year,
                    'month' => $e->run->month,
                ]
            ));

        return Inertia::render('my/payroll', [
            // Хагас тус бүрийн баганын бүтэц — задаргааг үүгээр угсарна
            'schemas' => [
                'first' => PayrollSchema::columns('first'),
                'second' => PayrollSchema::columns('second'),
            ],
            'employee' => [
                'full_name' => $employee->full_name,
                'employee_number' => $employee->employee_number,
                'position' => $employee->position?->name,
                'bank_account' => $employee->bank_account,
                'bank_name' => $employee->bank_name,
                'photo_url' => $employee->photo_url,
                'initials' => mb_substr($employee->last_name ?? '', 0, 1).mb_substr($employee->first_name ?? '', 0, 1),
            ],
            'entries' => $entries,
        ]);
    }
}
