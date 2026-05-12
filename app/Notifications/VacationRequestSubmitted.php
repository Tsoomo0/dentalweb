<?php

namespace App\Notifications;

use App\Models\HR\VacationRequest;
use App\Mail\VacationRequestSubmittedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class VacationRequestSubmitted extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;
    public function __construct(public readonly VacationRequest $vacationRequest) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (!empty($notifiable->email)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail(object $notifiable): VacationRequestSubmittedMail
    {
        return (new VacationRequestSubmittedMail($this->vacationRequest))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $emp = $this->vacationRequest->employee;
        return [
            'type'                   => 'vacation_request_submitted',
            'employee_name'          => $emp->full_name,
            'employee_number'        => $emp->employee_number,
            'vacation_request_id'    => $this->vacationRequest->id,
            'start_date'             => $this->vacationRequest->start_date->toDateString(),
            'end_date'               => $this->vacationRequest->end_date->toDateString(),
            'days'                   => $this->vacationRequest->days,
            'message'                => "{$emp->full_name} ээлжийн амралтын хүсэлт илгээлээ",
        ];
    }
}
