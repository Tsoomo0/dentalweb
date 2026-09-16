<?php

namespace App\Notifications;

use App\Models\LabOrder;
use Illuminate\Notifications\Notification;

/** Лаб буцаалтын ажлыг янзалж дуусаад ресепшн рүү буцаасан */
class LabOrderReturnFixed extends Notification
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
            'return_ready_date' => $this->labOrder->return_ready_date?->toDateString(),
        ];
    }
}
