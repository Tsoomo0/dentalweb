<?php

namespace App\Mail;

use App\Models\Lab\LabLesson;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Шинэ видео хичээл нийтлэгдэхэд лаб ажилтанд илгээх и-мэйл. */
class LabLessonPublishedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly LabLesson $lesson) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "🎬 Шинэ видео хичээл — {$this->lesson->title}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.lab-lesson-published');
    }
}
