<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Алдсан дуудлага SLA хугацаанд баригдаагүй — удирдлагад давхар мэдэгдэнэ.
 */
class MissedCallEscalated extends Notification
{
    public function __construct(
        public readonly int $callId,
        public readonly string $number,
        public readonly ?string $branchName,
        public readonly ?string $calledAt,
        public readonly int $waitedMinutes,
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
            'called_at' => $this->calledAt,
            'waited_minutes' => $this->waitedMinutes,
            'url' => '/admin/calls?status=unhandled',
        ];
    }
}
