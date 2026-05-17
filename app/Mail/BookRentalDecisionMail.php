<?php

namespace App\Mail;

use App\Models\HR\BookRental;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookRentalDecisionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly BookRental $rental) {}

    public function envelope(): Envelope
    {
        $book = $this->rental->book->title;
        $status = $this->rental->status === 'approved' ? '✅ Зөвшөөрөгдлөө' : '❌ Цуцлагдлаа';

        return new Envelope(subject: "📚 Номын түрээс {$status} — {$book}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.book-rental-decision');
    }
}
