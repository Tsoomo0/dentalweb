<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class EmployeeExpiryReminder extends Notification
{
    public function __construct(
        public readonly string $type,           // 'contract' | 'license' | 'probation'
        public readonly string $employeeName,
        public readonly string $employeeNumber,
        public readonly string $itemName,       // гэрээний төрөл эсвэл лицензийн нэр
        public readonly string $endDate,
        public readonly int $daysLeft,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => $this->type,
            'employee_name' => $this->employeeName,
            'employee_number' => $this->employeeNumber,
            'item_name' => $this->itemName,
            'end_date' => $this->endDate,
            'days_left' => $this->daysLeft,
        ];
    }
}
