<?php

namespace App\Notifications;

use App\Mail\LabTrainingSummaryMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/** Сургалтын долоо хоногийн хураангуй — админ, удирдлагад. */
class LabTrainingSummary extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** @param  array<string, mixed>  $digest */
    public function __construct(
        public readonly array $digest,
        public readonly string $rangeLabel,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): LabTrainingSummaryMail
    {
        return (new LabTrainingSummaryMail($this->digest, $this->rangeLabel))
            ->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'title'        => 'Сургалтын долоо хоногийн хураангуй',
            'range'        => $this->rangeLabel,
            'completions'  => $this->digest['completions'],
            'active_staff' => $this->digest['active_staff'],
            'overdue'      => $this->digest['overdue_total'],
            'completion_percent' => $this->digest['completion_percent'],
            'url'          => '/admin/lab-training/report',
        ];
    }
}
