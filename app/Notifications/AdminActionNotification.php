<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Бусад админд эмэйл / database notification илгээх.
 * AuditService::log()-аас автомат дуудагдана (admin-аас хийгдсэн write үйлдэл бүрд).
 */
class AdminActionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string  $event,           // created / updated / deleted / status_changed ...
        public readonly string  $description,     // human-readable text
        public readonly string  $actorName,
        public readonly ?string $subjectType = null,
        public readonly ?int    $subjectId = null,
        public readonly ?string $url = null,      // detail page URL (optional)
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $eventLabel = match ($this->event) {
            'created'        => 'Шинээр үүсгэв',
            'updated'        => 'Шинэчлэв',
            'deleted'        => 'Устгав',
            'status_changed' => 'Статус өөрчлөв',
            'confirmed'      => 'Баталгаажуулав',
            'rejected'       => 'Татгалзав',
            'approved'       => 'Зөвшөөрөв',
            default          => ucfirst($this->event),
        };

        $msg = (new MailMessage)
            ->subject("[Cuticul] {$this->actorName} — {$eventLabel}")
            ->greeting('Сайн байна уу!')
            ->line("**{$this->actorName}** дараах үйлдлийг хийлээ:")
            ->line($this->description);

        if ($this->url) {
            $msg->action('Дэлгэрэнгүй харах', $this->url);
        }

        return $msg->line('Cuticul Dental Clinic — admin notification system.');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'event'        => $this->event,
            'description'  => $this->description,
            'actor_name'   => $this->actorName,
            'subject_type' => $this->subjectType,
            'subject_id'   => $this->subjectId,
            'url'          => $this->url,
        ];
    }
}
