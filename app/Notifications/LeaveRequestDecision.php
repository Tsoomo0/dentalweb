<?php

namespace App\Notifications;

use App\Models\HR\LeaveRequest;
use App\Mail\LeaveRequestDecisionMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class LeaveRequestDecision extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;
    public function __construct(public readonly LeaveRequest $leaveRequest) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (!empty($notifiable->email)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail(object $notifiable): LeaveRequestDecisionMail
    {
        return (new LeaveRequestDecisionMail($this->leaveRequest))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $approved = $this->leaveRequest->isApproved();
        return [
            'type'             => 'leave_request_decision',
            'leave_request_id' => $this->leaveRequest->id,
            'status'           => $this->leaveRequest->status,
            'start_date'       => $this->leaveRequest->start_date->toDateString(),
            'end_date'         => $this->leaveRequest->end_date->toDateString(),
            'rejection_reason' => $this->leaveRequest->rejection_reason,
            'message'          => $approved
                ? 'Таны чөлөөний хүсэлт зөвшөөрөгдлөө ✅'
                : 'Таны чөлөөний хүсэлт цуцлагдлаа ❌',
        ];
    }
}
