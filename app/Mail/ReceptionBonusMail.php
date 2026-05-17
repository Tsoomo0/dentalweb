<?php

namespace App\Mail;

use App\Models\HR\ReceptionBonusEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReceptionBonusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ReceptionBonusEntry $entry) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Урамшууллын задаргаа — '.$this->entry->run?->title,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.reception-bonus');
    }
}
