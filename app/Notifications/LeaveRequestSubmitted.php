<?php

namespace App\Notifications;

use App\Models\HR\LeaveRequest;
use App\Mail\LeaveRequestSubmittedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class LeaveRequestSubmitted extends Notification implements ShouldQueue
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

    public function toMail(object $notifiable): LeaveRequestSubmittedMail
    {
        return (new LeaveRequestSubmittedMail($this->leaveRequest))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $emp = $this->leaveRequest->employee;
        return [
            'type'             => 'leave_request_submitted',
            'employee_name'    => $emp->full_name,
            'employee_number'  => $emp->employee_number,
            'leave_request_id' => $this->leaveRequest->id,
            'start_date'       => $this->leaveRequest->start_date->toDateString(),
            'end_date'         => $this->leaveRequest->end_date->toDateString(),
            'leave_type'       => $this->leaveRequest->leave_type,
            'days'             => $this->leaveRequest->days,
            'message'          => "{$emp->full_name} чөлөөний хүсэлт илгээлээ",
        ];
    }
}
