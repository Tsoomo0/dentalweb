<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class OutstandingPaid extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly int $amount,
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
            'branch_name' => $this->branchName,
            'date' => $this->date,
            'receptionist_name' => $this->receptionistName,
        ];
    }
}
