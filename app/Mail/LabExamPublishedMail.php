<?php

namespace App\Mail;

use App\Models\Lab\LabExam;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Шинэ шалгалт нээгдэхэд лаб ажилтанд илгээх и-мэйл. */
class LabExamPublishedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly LabExam $exam) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "📝 Шинэ шалгалт — {$this->exam->title}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.lab-exam-published');
    }
}
