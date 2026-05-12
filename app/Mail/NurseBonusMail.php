<?php

namespace App\Mail;

use App\Models\HR\NurseBonusEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NurseBonusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public NurseBonusEntry $entry) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Сувилагчийн урамшуулал — ' . $this->entry->run?->title,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.nurse-bonus');
    }
}
