<?php

namespace App\Mail;

use App\Models\HR\EquipmentAssignment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EquipmentAssignmentResponseMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly EquipmentAssignment $assignment) {}

    public function build(): self
    {
        $emp = $this->assignment->employee->full_name;
        $name = $this->assignment->equipment->name;
        $subj = $this->assignment->isAccepted()
            ? "✅ {$emp} тоног төхөөрөмж хүлээн авлаа — {$name}"
            : "❌ {$emp} тоног төхөөрөмж татгалзлаа — {$name}";

        return $this->subject($subj)->view('emails.equipment-assignment-response');
    }
}
