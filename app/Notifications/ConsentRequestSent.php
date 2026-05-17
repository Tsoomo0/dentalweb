<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class ConsentRequestSent extends Notification
{
    public function __construct(
        public readonly string $templateTitle,
        public readonly string $receptionName,
        public readonly string $patientName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'template_title' => $this->templateTitle,
            'reception_name' => $this->receptionName,
            'patient_name' => $this->patientName,
        ];
    }
}
