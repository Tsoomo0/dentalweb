<?php

namespace App\Notifications;

use App\Models\HR\EmployeeDocument;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Захирал гарын үсэг зурсны дараа ажилтанд очих мэдэгдэл.
 */
class EmployeeDocumentSent extends Notification
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
            ->subject('✍️ '.$d->title.' — гарын үсэг зурна уу')
            ->greeting('Сайн байна уу!')
            ->line("Танд «{$d->title}» баримт ирлээ.")
            ->line($d->employer_signature
                ? "{$d->employer_position} {$d->employer_name} гарын үсэг зурж баталгаажуулсан байна."
                : 'Ажил олгогчийн зүгээс илгээв.')
            ->line('Та системд нэвтэрч агуулгатай танилцаад гарын үсгээ зурна уу.')
            ->action('Гарын үсэг зурах', url('/my/contracts'))
            ->line('Хоёр тал гарын үсэг зурсны дараа баримт и-мэйлээр тань руу PDF хэлбэрээр очно.');
    }

    public function toDatabase(object $notifiable): array
    {
        $d = $this->document;

        return [
            'type' => 'employee_document_sent',
            'document_id' => $d->id,
            'document_type' => $d->type,
            'type_label' => $d->type_label,
            'title' => $d->title,
            'employer_name' => $d->employer_name,
            'message' => "Танд «{$d->title}» ирлээ — гарын үсэг зурна уу",
        ];
    }
}
