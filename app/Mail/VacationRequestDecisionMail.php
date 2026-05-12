<?php

namespace App\Mail;

use App\Models\HR\VacationRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VacationRequestDecisionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly VacationRequest $vacationRequest) {}

    public function envelope(): Envelope
    {
        $subject = $this->vacationRequest->isApproved()
            ? '✅ Ээлжийн амралтын хүсэлт зөвшөөрөгдлөө'
            : '❌ Ээлжийн амралтын хүсэлт цуцлагдлаа';
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.vacation-request-decision');
    }
}
