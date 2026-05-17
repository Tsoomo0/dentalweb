<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class LeasingPaidByPatient extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly int $amount,
        public readonly int $installmentNumber,
        public readonly int $planId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'patient_name' => $this->patientName,
            'amount' => $this->amount,
            'installment_number' => $this->installmentNumber,
            'plan_id' => $this->planId,
            'message' => "{$this->patientName} — лизингийн {$this->installmentNumber}-р сар QPay-р төлөгдлөө",
        ];
    }
}
