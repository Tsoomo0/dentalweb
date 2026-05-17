<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class OverpaidUsed extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly int $amount,
        public readonly string $branchName,
        public readonly string $sourceDate,
        public readonly ?string $usedReceipt,
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
            'source_date' => $this->sourceDate,
            'used_receipt' => $this->usedReceipt,
            'receptionist_name' => $this->receptionistName,
        ];
    }
}
