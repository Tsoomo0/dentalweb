<?php

namespace App\Console\Commands;

use App\Models\HR\EmployeeContract;
use App\Models\HR\EmployeeLicense;
use App\Models\HR\Employee;
use App\Models\User;
use App\Notifications\EmployeeExpiryReminder;
use Illuminate\Console\Command;

class CheckEmployeeExpiry extends Command
{
    protected $signature   = 'hr:check-expiry';
    protected $description = 'Ажилтны гэрээ болон лицензийн дуусах хугацааг шалгаж HR-д сануулга явуулна';

    // Хэдэн хоногийн өмнө сануулах
    private array $alertDays = [180, 90, 30, 7];

    public function handle(): void
    {
        $hrAdmins = User::whereHas('role', fn($q) => $q->whereIn('name', ['admin', 'hr']))->get();

        if ($hrAdmins->isEmpty()) {
            $this->warn('HR admin олдсонгүй.');
            return;
        }

        $contractCount = $this->checkContracts($hrAdmins);
        $licenseCount  = $this->checkLicenses($hrAdmins);
        $probationCount = $this->checkProbation($hrAdmins);

        $this->info("Гэрээ: {$contractCount} · Лиценз: {$licenseCount} · Туршилт: {$probationCount} сануулга явлаа.");
    }

    private function checkContracts($admins): int
    {
        $count = 0;

        foreach ($this->alertDays as $days) {
            $date = now()->addDays($days)->toDateString();

            EmployeeContract::with('employee')
                ->whereDate('end_date', $date)
                ->get()
                ->each(function (EmployeeContract $c) use ($admins, $days, &$count) {
                    $emp  = $c->employee;
                    $name = $c->contract_type === 'fixed' ? 'Тодорхой хугацаатай гэрээ' : 'Гэрээ';

                    foreach ($admins as $admin) {
                        $admin->notify(new EmployeeExpiryReminder(
                            type:           'contract',
                            employeeName:   $emp->full_name,
                            employeeNumber: $emp->employee_number,
                            itemName:       $name,
                            endDate:        $c->end_date->format('Y.m.d'),
                            daysLeft:       $days,
                        ));
                    }
                    $count++;
                });
        }

        return $count;
    }

    private function checkLicenses($admins): int
    {
        $count = 0;

        foreach ($this->alertDays as $days) {
            $date = now()->addDays($days)->toDateString();

            EmployeeLicense::with('employee')
                ->whereDate('end_date', $date)
                ->get()
                ->each(function (EmployeeLicense $l) use ($admins, $days, &$count) {
                    $emp = $l->employee;

                    foreach ($admins as $admin) {
                        $admin->notify(new EmployeeExpiryReminder(
                            type:           'license',
                            employeeName:   $emp->full_name,
                            employeeNumber: $emp->employee_number,
                            itemName:       $l->name,
                            endDate:        $l->end_date->format('Y.m.d'),
                            daysLeft:       $days,
                        ));
                    }
                    $count++;
                });
        }

        return $count;
    }

    private function checkProbation($admins): int
    {
        $count = 0;
        $date  = now()->addDays(14)->toDateString();

        Employee::whereDate('probation_end_date', $date)
            ->where('status', 'active')
            ->get()
            ->each(function (Employee $emp) use ($admins, &$count) {
                foreach ($admins as $admin) {
                    $admin->notify(new EmployeeExpiryReminder(
                        type:           'probation',
                        employeeName:   $emp->full_name,
                        employeeNumber: $emp->employee_number,
                        itemName:       'Туршилтын хугацаа',
                        endDate:        $emp->probation_end_date->format('Y.m.d'),
                        daysLeft:       14,
                    ));
                }
                $count++;
            });

        return $count;
    }
}
