<?php

namespace App\Mail;

use App\Models\HR\PayrollEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PayrollSlipMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly PayrollEntry $entry) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Цалингийн задаргаа — ' . $this->entry->run->title);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.payroll-slip');
    }
}
