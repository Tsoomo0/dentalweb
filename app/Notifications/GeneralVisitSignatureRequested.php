<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class GeneralVisitSignatureRequested extends Notification
{
    public function __construct(
        public readonly string $doctorName,
        public readonly string $visitDate,
        public readonly string $patientName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'doctor_name' => $this->doctorName,
            'visit_date' => $this->visitDate,
            'patient_name' => $this->patientName,
        ];
    }
}
