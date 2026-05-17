<?php

namespace App\Notifications;

use App\Models\HR\EmployeeWarning;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WarningAcknowledged extends Notification
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
        $emp = $w->employee;

        return (new MailMessage)
            ->subject("✅ {$w->type_label} хүлээн зөвшөөрөгдлөө — {$emp->full_name}")
            ->greeting('Сайн байна уу!')
            ->line("{$emp->full_name} ажилтан «{$w->title}» {$w->type_label}-г хүлээн зөвшөөрлөө.")
            ->line("Тэмдэглэл: {$w->employee_response}");
    }

    public function toDatabase(object $notifiable): array
    {
        $w = $this->warning;
        $emp = $w->employee;

        return [
            'type' => 'warning_acknowledged',
            'warning_id' => $w->id,
            'warning_type' => $w->type,
            'type_label' => $w->type_label,
            'title' => $w->title,
            'employee_name' => $emp->full_name,
            'employee_response' => $w->employee_response,
            'message' => "{$emp->full_name} — «{$w->title}» {$w->type_label}-г хүлээн зөвшөөрлөө",
        ];
    }
}
