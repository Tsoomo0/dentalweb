<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class RefundProcessed extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly int $amount,
        public readonly string $method,
        public readonly ?string $reason,
        public readonly string $branchName,
        public readonly string $date,
        public readonly string $receptionistName,
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
            'method' => $this->method,
            'reason' => $this->reason,
            'branch_name' => $this->branchName,
            'date' => $this->date,
            'receptionist_name' => $this->receptionistName,
        ];
    }
}
