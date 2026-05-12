<?php

namespace App\Notifications;

use App\Models\HR\EquipmentAssignment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EquipmentReturnedByAdmin extends Notification
{
    public function __construct(public readonly EquipmentAssignment $assignment) {}

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
        $eq = $this->assignment->equipment;
        return (new MailMessage)
            ->subject("📦 Тоног төхөөрөмж буцааж авагдлаа — {$eq->name}")
            ->greeting('Сайн байна уу!')
            ->line("«{$eq->name}» тоног төхөөрөмжийг удирдлага буцааж авлаа.")
            ->line('Огноо: ' . ($this->assignment->returned_at?->format('Y-m-d H:i') ?? now()->format('Y-m-d H:i')))
            ->line('Танд хамтран ажилласанд баярлалаа.');
    }

    public function toDatabase(object $notifiable): array
    {
        $eq  = $this->assignment->equipment;
        $emp = $this->assignment->employee;
        return [
            'type'                    => 'equipment_returned_by_admin',
            'equipment_assignment_id' => $this->assignment->id,
            'equipment_name'          => $eq->name,
            'equipment_serial'        => $eq->serial_number,
            'employee_name'           => $emp->full_name,
            'message'                 => "«{$eq->name}» тоног төхөөрөмжийг удирдлага буцааж авлаа",
        ];
    }
}
