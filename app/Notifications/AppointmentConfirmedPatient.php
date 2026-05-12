<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class AppointmentConfirmedPatient extends Notification
{
    public function __construct(
        public readonly string  $appointmentNumber,
        public readonly string  $appointmentDate,
        public readonly string  $appointmentTime,
        public readonly ?string $doctorName,
        public readonly ?string $branchName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'appointment_number' => $this->appointmentNumber,
            'appointment_date'   => $this->appointmentDate,
            'appointment_time'   => $this->appointmentTime,
            'doctor_name'        => $this->doctorName,
            'branch_name'        => $this->branchName,
        ];
    }
}
