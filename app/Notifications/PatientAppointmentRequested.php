<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class PatientAppointmentRequested extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly string $patientPhone,
        public readonly ?string $preferredDate,
        public readonly ?string $preferredTime,
        public readonly ?string $notes,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'patient_name' => $this->patientName,
            'patient_phone' => $this->patientPhone,
            'preferred_date' => $this->preferredDate,
            'preferred_time' => $this->preferredTime,
            'notes' => $this->notes,
        ];
    }
}
