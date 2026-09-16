<?php

namespace App\Notifications;

use App\Mail\LabExamPublishedMail;
use App\Models\Lab\LabExam;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/** Шинэ шалгалт нээгдлээ — лаб ажилтнуудад (мэдэгдэл + и-мэйл). */
class LabExamPublished extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly LabExam $exam) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        // И-мэйл хаяггүй ажилтанд зөвхөн дотоод мэдэгдэл очно
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): LabExamPublishedMail
    {
        return (new LabExamPublishedMail($this->exam))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'lab_exam_id' => $this->exam->id,
            'exam_title' => $this->exam->title,
            'course_title' => $this->exam->course?->title,
            'duration_minutes' => $this->exam->duration_minutes,
            'pass_percent' => $this->exam->pass_percent,
            'closes_at' => $this->exam->closes_at?->toDateTimeString(),
            'url' => '/my/training/exams/'.$this->exam->id,
        ];
    }
}
