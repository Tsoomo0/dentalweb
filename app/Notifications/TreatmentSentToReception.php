<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class TreatmentSentToReception extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly string $doctorName,
        public readonly int    $amount,
        public readonly ?string $appointmentNumber,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'patient_name'        => $this->patientName,
            'doctor_name'         => $this->doctorName,
            'amount'              => $this->amount,
            'appointment_number'  => $this->appointmentNumber,
        ];
    }
}
