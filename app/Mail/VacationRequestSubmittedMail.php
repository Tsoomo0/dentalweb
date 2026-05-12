<?php

namespace App\Mail;

use App\Models\HR\VacationRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VacationRequestSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly VacationRequest $vacationRequest) {}

    public function envelope(): Envelope
    {
        $name = $this->vacationRequest->employee->full_name;
        return new Envelope(subject: "🏖️ Ээлжийн амралтын хүсэлт — {$name}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.vacation-request-submitted');
    }
}
