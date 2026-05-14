<?php

namespace App\Services\Bot;

use App\Models\HR\Employee;
use App\Models\HR\NurseBonusEntry;
use App\Models\HR\PayrollEntry;
use App\Models\HR\ReceptionBonusEntry;
use App\Models\HR\VacationRequest;
use App\Models\User;

/**
 * Resolves the `data_source` placeholders inside bot node bodies.
 *
 * Each `data_source` string maps to a method here that returns an associative
 * array which is merged into the body via {{key}} substitution.
 */
class BotDataResolver
{
    /**
     * @return array<string, string>  flat map for {{placeholder}} substitution
     */
    public function resolve(User $user, ?string $source): array
    {
        if (!$source) {
            return [];
        }

        return match ($source) {
            'user_payroll_last'     => $this->payrollLast($user),
            'user_payroll_history'  => $this->payrollHistory($user),
            'user_vacation_balance' => $this->vacationBalance($user),
            'user_reception_bonus'  => $this->receptionBonus($user),
            'user_nurse_bonus'      => $this->nurseBonus($user),
            'user_profile'          => $this->profile($user),
            default                 => [],
        };
    }

    public function apply(string $body, array $data): string
    {
        if (!$data) {
            return $body;
        }
        return preg_replace_callback('/\{\{\s*([\w.]+)\s*\}\}/', function ($m) use ($data) {
            return $data[$m[1]] ?? $m[0];
        }, $body);
    }

    protected function payrollLast(User $user): array
    {
        $employee = $user->employee;
        if (!$employee) {
            return ['payroll.amount' => '—', 'payroll.month' => '—'];
        }

        $entry = PayrollEntry::query()
            ->where('employee_id', $employee->id)
            ->latest('id')
            ->first();

        return [
            'payroll.amount' => $entry ? number_format((float) ($entry->net_pay ?? $entry->total_pay ?? 0)) . '₮' : '—',
            'payroll.month'  => $entry?->payrollRun?->period_label ?? '—',
        ];
    }

    protected function payrollHistory(User $user): array
    {
        $employee = $user->employee;
        if (!$employee) {
            return ['payroll.history' => '—'];
        }

        $rows = PayrollEntry::query()
            ->where('employee_id', $employee->id)
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(fn ($e) => '• ' . ($e->payrollRun?->period_label ?? '—')
                . ': ' . number_format((float) ($e->net_pay ?? $e->total_pay ?? 0)) . '₮')
            ->implode("\n");

        return ['payroll.history' => $rows ?: '—'];
    }

    protected function vacationBalance(User $user): array
    {
        $employee = $user->employee;
        if (!$employee) {
            return ['vacation.days' => '—', 'vacation.used' => '—', 'vacation.remaining' => '—'];
        }

        $total = (int) ($employee->vacation_days ?? 0) + (int) ($employee->vacation_extra_days ?? 0);
        $used  = (int) VacationRequest::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->sum('days');

        return [
            'vacation.days'      => (string) $total,
            'vacation.used'      => (string) $used,
            'vacation.remaining' => (string) max(0, $total - $used),
        ];
    }

    protected function receptionBonus(User $user): array
    {
        $employee = $user->employee;
        if (!$employee) {
            return ['bonus.amount' => '—', 'bonus.month' => '—'];
        }

        $entry = ReceptionBonusEntry::query()
            ->where('employee_id', $employee->id)
            ->latest('id')
            ->first();

        return [
            'bonus.amount' => $entry ? number_format((float) ($entry->total_bonus ?? $entry->amount ?? 0)) . '₮' : '—',
            'bonus.month'  => $entry?->receptionBonusRun?->period_label ?? '—',
        ];
    }

    protected function nurseBonus(User $user): array
    {
        $employee = $user->employee;
        if (!$employee) {
            return ['bonus.amount' => '—', 'bonus.month' => '—'];
        }

        $entry = NurseBonusEntry::query()
            ->where('employee_id', $employee->id)
            ->latest('id')
            ->first();

        return [
            'bonus.amount' => $entry ? number_format((float) ($entry->total_bonus ?? $entry->amount ?? 0)) . '₮' : '—',
            'bonus.month'  => $entry?->nurseBonusRun?->period_label ?? '—',
        ];
    }

    protected function profile(User $user): array
    {
        $e = $user->employee;
        return [
            'profile.name'     => $e ? trim($e->last_name . ' ' . $e->first_name) : ($user->name ?? '—'),
            'profile.position' => $e?->position?->name ?? '—',
            'profile.branch'   => $e?->branch?->name ?? '—',
        ];
    }
}
