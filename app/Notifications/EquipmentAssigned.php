<?php

namespace App\Notifications;

use App\Mail\EquipmentAssignedMail;
use App\Models\HR\EquipmentAssignment;
use Illuminate\Notifications\Notification;

class EquipmentAssigned extends Notification
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

    public function toMail(object $notifiable): EquipmentAssignedMail
    {
        return (new EquipmentAssignedMail($this->assignment))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $eq  = $this->assignment->equipment;
        $emp = $this->assignment->employee;
        return [
            'type'                    => 'equipment_assigned',
            'equipment_assignment_id' => $this->assignment->id,
            'equipment_name'          => $eq->name,
            'equipment_serial'        => $eq->serial_number,
            'equipment_condition'     => $eq->condition_label,
            'employee_name'           => $emp->full_name,
            'message'                 => "«{$eq->name}» тоног төхөөрөмж хүлээн авах хүсэлт ирлээ",
        ];
    }
}
