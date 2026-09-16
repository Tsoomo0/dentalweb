<?php

namespace App\Mail;

use App\Models\Lab\LabLesson;
use App\Models\Lab\LabTrainingReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Заавал үзэх хичээлийн хугацааны сануулга — ажилтанд. */
class LabLessonDeadlineMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly LabLesson $lesson,
        public readonly string $kind,
        public readonly int $days,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->isOverdue()
            ? "⚠️ Хугацаа хэтэрсэн хичээл — {$this->lesson->title}"
            : "⏳ {$this->days} хоногийн дараа хаагдана — {$this->lesson->title}";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.lab-lesson-deadline',
            with: ['isOverdue' => $this->isOverdue()],
        );
    }

    public function isOverdue(): bool
    {
        return $this->kind === LabTrainingReminder::KIND_OVERDUE;
    }
}
