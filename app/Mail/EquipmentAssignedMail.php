<?php

namespace App\Mail;

use App\Models\HR\EquipmentAssignment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EquipmentAssignedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly EquipmentAssignment $assignment) {}

    public function build(): self
    {
        return $this
            ->subject('📦 Тоног төхөөрөмж хүлээн авах хүсэлт — '.$this->assignment->equipment->name)
            ->view('emails.equipment-assigned');
    }
}
