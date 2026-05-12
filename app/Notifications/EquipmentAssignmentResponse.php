<?php

namespace App\Notifications;

use App\Mail\EquipmentAssignmentResponseMail;
use App\Models\HR\EquipmentAssignment;
use Illuminate\Notifications\Notification;

class EquipmentAssignmentResponse extends Notification
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

    public function toMail(object $notifiable): EquipmentAssignmentResponseMail
    {
        return (new EquipmentAssignmentResponseMail($this->assignment))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $eq  = $this->assignment->equipment;
        $emp = $this->assignment->employee;
        return [
            'type'                    => 'equipment_assignment_response',
            'equipment_assignment_id' => $this->assignment->id,
            'equipment_name'          => $eq->name,
            'employee_name'           => $emp->full_name,
            'status'                  => $this->assignment->status,
            'rejection_reason'        => $this->assignment->rejection_reason,
            'message'                 => $this->assignment->isAccepted()
                ? "{$emp->full_name} «{$eq->name}» тоног төхөөрөмж хүлээн авлаа ✅"
                : "{$emp->full_name} «{$eq->name}» тоног төхөөрөмж татгалзлаа ❌",
        ];
    }
}
