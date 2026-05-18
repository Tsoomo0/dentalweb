<?php

namespace App\Notifications;

use App\Models\LabOrder;
use Illuminate\Notifications\Notification;

class LabOrderReady extends Notification
{
    public function __construct(public readonly LabOrder $labOrder) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'lab_order_id' => $this->labOrder->id,
            'lab_name' => $this->labOrder->lab_name,
            'patient_name' => trim(($this->labOrder->patient_last_name ?? '').' '.$this->labOrder->patient_first_name),
            'work_description' => $this->labOrder->work_description,
            'branch_name' => $this->labOrder->branch?->name,
            'lab_ready_date' => $this->labOrder->lab_ready_date?->toDateString(),
        ];
    }
}
