<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class MissedCall extends Notification
{
    public function __construct(
        public readonly int $callId,
        public readonly string $number,
        public readonly ?string $branchName,
        public readonly ?string $queueName,
        public readonly ?string $calledAt,
        public readonly int $repeatCount = 1,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'call_id' => $this->callId,
            'number' => $this->number,
            'branch_name' => $this->branchName,
            'queue_name' => $this->queueName,
            'called_at' => $this->calledAt,
            'repeat_count' => $this->repeatCount,
            'url' => '/reception/calls?missed=1',
        ];
    }
}
