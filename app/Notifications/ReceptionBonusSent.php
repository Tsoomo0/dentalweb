<?php

namespace App\Notifications;

use App\Mail\ReceptionBonusMail;
use App\Models\HR\ReceptionBonusEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class ReceptionBonusSent extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public ReceptionBonusEntry $entry) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): ReceptionBonusMail
    {
        return (new ReceptionBonusMail($this->entry))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $run = $this->entry->run;

        return [
            'type' => 'reception_bonus_sent',
            'run_id' => $run?->id,
            'run_title' => $run?->title,
            'half_label' => $run?->half_label,
            'total_amount' => $this->entry->total_amount,
            'message' => 'Урамшууллын задаргаа ирлээ',
            'url' => '/my/reception-bonus',
        ];
    }
}
