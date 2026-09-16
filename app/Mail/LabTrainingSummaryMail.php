<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Сургалтын долоо хоногийн хураангуй — админд илгээх и-мэйл. */
class LabTrainingSummaryMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param  array<string, mixed>  $digest */
    public function __construct(
        public readonly array $digest,
        public readonly string $rangeLabel,
    ) {}

    public function envelope(): Envelope
    {
        $overdue = (int) $this->digest['overdue_total'];

        $subject = $overdue > 0
            ? "📚 Сургалтын хураангуй ({$this->rangeLabel}) — {$overdue} хоцрогдол"
            : "📚 Сургалтын хураангуй ({$this->rangeLabel})";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.lab-training-summary');
    }
}
