<?php

namespace App\Notifications;

use App\Mail\NurseBonusMail;
use App\Models\HR\NurseBonusEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class NurseBonusSent extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public NurseBonusEntry $entry) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (!empty($notifiable->email)) $channels[] = 'mail';
        return $channels;
    }

    public function toMail(object $notifiable): NurseBonusMail
    {
        return (new NurseBonusMail($this->entry))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $run = $this->entry->run;
        return [
            'type'         => 'nurse_bonus_sent',
            'run_id'       => $run?->id,
            'run_title'    => $run?->title,
            'half_label'   => $run?->half_label,
            'total_amount' => $this->entry->total_amount,
            'message'      => 'Сувилагчийн урамшуулал ирлээ',
            'url'          => '/my/nurse-bonus',
        ];
    }
}
