<?php

namespace App\Mail;

use App\Models\HR\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeaveRequestSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly LeaveRequest $leaveRequest) {}

    public function envelope(): Envelope
    {
        $name = $this->leaveRequest->employee->full_name;

        return new Envelope(subject: "📋 Чөлөөний хүсэлт — {$name}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.leave-request-submitted');
    }
}
