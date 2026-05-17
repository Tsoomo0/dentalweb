<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class OrthoVisitSigned extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly string $visitDate,
        public readonly string $signerName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'patient_name' => $this->patientName,
            'visit_date' => $this->visitDate,
            'signer_name' => $this->signerName,
        ];
    }
}
