<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Appointment $appointment,
        public readonly string $type  // '24h' | '2h'
    ) {}

    public function envelope(): Envelope
    {
        $number = $this->appointment->appointment_number;
        $label  = $this->type === '24h' ? '24 цагийн' : '2 цагийн';
        return new Envelope(subject: "⏰ Цаг захиалгын сануулга ({$label} үлдлээ) — {$number}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.appointment-reminder');
    }
}
