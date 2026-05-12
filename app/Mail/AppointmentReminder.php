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

        if ($this->appointment->type === 'in_person') {
            $subject = $this->type === '24h'
                ? "🦷 Таны үзүүлэх цаг маргааш болно — #{$number}"
                : "🦷 Таны үзүүлэх цаг удахгүй болно — #{$number}";
        } else {
            $label   = $this->type === '24h' ? '24 цагийн' : '2 цагийн';
            $subject = "⏰ Онлайн зөвлөгөөний сануулга ({$label} үлдлээ) — #{$number}";
        }

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.appointment-reminder');
    }
}
