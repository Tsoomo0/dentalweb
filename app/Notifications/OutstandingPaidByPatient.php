<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class OutstandingPaidByPatient extends Notification
{
    public function __construct(
        public readonly string $patientName,
        public readonly int    $amount,
        public readonly int    $recordId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'patient_name' => $this->patientName,
            'amount'       => $this->amount,
            'record_id'    => $this->recordId,
            'message'      => "{$this->patientName} — дутуу тооцоо {$this->amount}₮ QPay-р төлөгдлөө",
        ];
    }
}
