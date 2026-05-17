<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class ConsentFormSigned extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly string $templateTitle,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'patient_name' => $this->patientName,
            'template_title' => $this->templateTitle,
        ];
    }
}
