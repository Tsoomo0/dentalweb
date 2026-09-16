<?php

namespace App\Notifications;

use App\Mail\LabLessonPublishedMail;
use App\Models\Lab\LabLesson;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/** Шинэ видео хичээл нийтлэгдлээ — лаб ажилтнуудад (мэдэгдэл + и-мэйл). */
class LabLessonPublished extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly LabLesson $lesson) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        // И-мэйл хаяггүй ажилтанд зөвхөн дотоод мэдэгдэл очно
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): LabLessonPublishedMail
    {
        return (new LabLessonPublishedMail($this->lesson))->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'lab_lesson_id' => $this->lesson->id,
            'lesson_title' => $this->lesson->title,
            'course_title' => $this->lesson->course?->title,
            'duration' => $this->lesson->duration_label,
            'url' => '/my/training/lessons/'.$this->lesson->id,
        ];
    }
}
