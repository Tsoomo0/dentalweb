<?php

namespace App\Notifications;

use App\Models\HR\FeedbackRequest;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FeedbackSubmitted extends Notification
{
    public function __construct(public readonly FeedbackRequest $feedback) {}

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
        $emp = $this->feedback->employee;

        return (new MailMessage)
            ->subject("💬 Шинэ {$this->feedback->type_label} — {$this->feedback->subject}")
            ->greeting('Сайн байна уу!')
            ->line("{$emp->full_name} ажилтнаас шинэ {$this->feedback->type_label} ирлээ.")
            ->line("Гарчиг: {$this->feedback->subject}")
            ->line("Агуулга: {$this->feedback->body}");
    }

    public function toDatabase(object $notifiable): array
    {
        $emp = $this->feedback->employee;

        return [
            'type' => 'feedback_submitted',
            'feedback_id' => $this->feedback->id,
            'feedback_type' => $this->feedback->type,
            'type_label' => $this->feedback->type_label,
            'subject' => $this->feedback->subject,
            'employee_name' => $emp->full_name,
            'message' => "{$emp->full_name} — «{$this->feedback->subject}» {$this->feedback->type_label} ирлээ",
        ];
    }
}
