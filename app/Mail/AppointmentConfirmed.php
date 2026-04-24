<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param Appointment $appointment
     * @param string      $recipient  'patient' | 'doctor'
     */
    public function __construct(
        public readonly Appointment $appointment,
        public readonly string $recipient
    ) {}

    public function envelope(): Envelope
    {
        $number  = $this->appointment->appointment_number;
        $subject = $this->recipient === 'patient'
            ? "✅ Онлайн зөвлөгөө баталгаажлаа — {$number}"
            : "📋 Шинэ онлайн зөвлөгөөний захиалга — {$number}";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.appointment-confirmed',
        );
    }
}
