<?php

namespace App\Notifications;

use App\Mail\VacationRequestDecisionMail;
use App\Models\HR\VacationRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class VacationRequestDecision extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly VacationRequest $vacationRequest) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): VacationRequestDecisionMail
    {
        return (new VacationRequestDecisionMail($this->vacationRequest))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $approved = $this->vacationRequest->isApproved();

        return [
            'type' => 'vacation_request_decision',
            'vacation_request_id' => $this->vacationRequest->id,
            'status' => $this->vacationRequest->status,
            'start_date' => $this->vacationRequest->start_date->toDateString(),
            'end_date' => $this->vacationRequest->end_date->toDateString(),
            'rejection_reason' => $this->vacationRequest->rejection_reason,
            'message' => $approved
                ? 'Таны ээлжийн амралтын хүсэлт зөвшөөрөгдлөө ✅'
                : 'Таны ээлжийн амралтын хүсэлт цуцлагдлаа ❌',
        ];
    }
}
