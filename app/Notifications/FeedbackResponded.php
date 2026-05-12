<?php

namespace App\Notifications;

use App\Models\HR\FeedbackRequest;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FeedbackResponded extends Notification
{
    public function __construct(public readonly FeedbackRequest $feedback) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (!empty($notifiable->email)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $statusLabel = $this->feedback->status_label;
        return (new MailMessage)
            ->subject("📋 Таны {$this->feedback->type_label} шийдвэрлэгдлээ — {$statusLabel}")
            ->greeting('Сайн байна уу!')
            ->line("Таны «{$this->feedback->subject}» {$this->feedback->type_label} шийдвэрлэгдлээ.")
            ->line("Статус: {$statusLabel}")
            ->line("Хариу: " . ($this->feedback->admin_response ?? '—'));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'           => 'feedback_responded',
            'feedback_id'    => $this->feedback->id,
            'feedback_type'  => $this->feedback->type,
            'type_label'     => $this->feedback->type_label,
            'subject'        => $this->feedback->subject,
            'status'         => $this->feedback->status,
            'status_label'   => $this->feedback->status_label,
            'admin_response' => $this->feedback->admin_response,
            'message'        => "«{$this->feedback->subject}» {$this->feedback->type_label} — {$this->feedback->status_label}",
        ];
    }
}
