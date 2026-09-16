<?php

namespace App\Notifications;

use App\Models\HR\EmployeeDocument;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Ажилтан гэрээнд гарын үсэг зурахаас татгалзсан үед HR / админд очих мэдэгдэл.
 */
class EmployeeDocumentDeclined extends Notification
{
    public function __construct(public readonly EmployeeDocument $document) {}

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
        $d = $this->document;

        return (new MailMessage)
            ->subject('⚠️ '.$d->employee_name.' — '.$d->title.' -д гарын үсэг зурахаас татгалзлаа')
            ->greeting('Сайн байна уу!')
            ->line("{$d->employee_name} «{$d->title}»-д гарын үсэг зурахаас татгалзлаа.")
            ->line('Шалтгаан: '.($d->decline_reason ?: 'Тодорхойгүй'))
            ->action('Баримтыг харах', url('/hr/employee-documents'));
    }

    public function toDatabase(object $notifiable): array
    {
        $d = $this->document;

        return [
            'type' => 'employee_document_declined',
            'document_id' => $d->id,
            'document_type' => $d->type,
            'type_label' => $d->type_label,
            'title' => $d->title,
            'employee_name' => $d->employee_name,
            'decline_reason' => $d->decline_reason,
            'message' => "{$d->employee_name} «{$d->title}»-с татгалзлаа",
        ];
    }
}
