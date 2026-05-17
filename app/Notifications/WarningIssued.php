<?php

namespace App\Notifications;

use App\Models\HR\EmployeeWarning;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WarningIssued extends Notification
{
    public function __construct(public readonly EmployeeWarning $warning) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $w = $this->warning;

        return (new MailMessage)
            ->subject("⚠️ {$w->type_label} — {$w->title}")
            ->greeting('Сайн байна уу!')
            ->line("Танд {$w->type_label} ирлээ: {$w->title}")
            ->line("Ноцтой байдал: {$w->severity_label}")
            ->line("Арга хэмжээ: {$w->action_label}")
            ->line("Тайлбар: {$w->description}");
    }

    public function toDatabase(object $notifiable): array
    {
        $w = $this->warning;

        return [
            'type' => 'warning_issued',
            'warning_id' => $w->id,
            'warning_type' => $w->type,
            'type_label' => $w->type_label,
            'severity' => $w->severity,
            'severity_label' => $w->severity_label,
            'title' => $w->title,
            'action' => $w->action,
            'action_label' => $w->action_label,
            'incident_date' => $w->incident_date->format('Y-m-d'),
            'message' => "Танд «{$w->title}» {$w->type_label} ирлээ",
        ];
    }
}
