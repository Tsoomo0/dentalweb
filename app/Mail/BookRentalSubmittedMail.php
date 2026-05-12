<?php

namespace App\Mail;

use App\Models\HR\BookRental;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookRentalSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly BookRental $rental) {}

    public function envelope(): Envelope
    {
        $name = $this->rental->employee->full_name;
        return new Envelope(subject: "📚 Номын түрээсийн хүсэлт — {$name}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.book-rental-submitted');
    }
}
