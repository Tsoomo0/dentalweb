<?php

namespace App\Notifications;

use App\Models\HR\EmployeeDocument;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Ажилтан гарын үсэг зурсны дараа HR / админд очих мэдэгдэл.
 */
class EmployeeDocumentSigned extends Notification
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
            ->subject('✅ '.$d->employee_name.' — '.$d->title.' баталгаажлаа')
            ->greeting('Сайн байна уу!')
            ->line("{$d->employee_name} «{$d->title}»-д гарын үсэг зурлаа.")
            ->line('Баримт баталгаажсан бөгөөд хоёр талд PDF хувь и-мэйлээр илгээгдсэн.')
            ->action('Баримтыг харах', url('/hr/employee-documents'));
    }

    public function toDatabase(object $notifiable): array
    {
        $d = $this->document;

        return [
            'type' => 'employee_document_signed',
            'document_id' => $d->id,
            'document_type' => $d->type,
            'type_label' => $d->type_label,
            'title' => $d->title,
            'employee_name' => $d->employee_name,
            'signed_at' => $d->employee_signed_at?->format('Y-m-d H:i'),
            'message' => "{$d->employee_name} «{$d->title}»-д гарын үсэг зурлаа",
        ];
    }
}
