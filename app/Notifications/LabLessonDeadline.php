<?php

namespace App\Notifications;

use App\Mail\LabLessonDeadlineMail;
use App\Models\Lab\LabLesson;
use App\Models\Lab\LabTrainingReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/**
 * Заавал үзэх хичээлийн хугацааны сануулга.
 *
 * Хоёр төрөл нэг ангид багтсан — "ойртлоо" ба "хэтэрлээ" хоёр нь ижил
 * агуулгын өөр өнгө аяс төдий. Тусад нь ангилвал ижил кодыг хоёр газар
 * засах шаардлага үүсэх байсан.
 */
class LabLessonDeadline extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly LabLesson $lesson,
        public readonly string $kind,
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        // И-мэйл хаяггүй ажилтанд зөвхөн дотоод мэдэгдэл очно
        if (! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): LabLessonDeadlineMail
    {
        return (new LabLessonDeadlineMail($this->lesson, $this->kind, $this->days()))
            ->to($notifiable->email);
    }

    public function toDatabase(object $notifiable): array
    {
        $overdue = $this->kind === LabTrainingReminder::KIND_OVERDUE;

        return [
            'lab_lesson_id' => $this->lesson->id,
            'lesson_title'  => $this->lesson->title,
            'course_title'  => $this->lesson->course?->title,
            'kind'          => $this->kind,
            'days'          => $this->days(),
            'due_at'        => $this->lesson->due_at?->toDateString(),
            'title'         => $overdue
                ? 'Сургалтын хугацаа хэтэрлээ'
                : 'Сургалтын хугацаа дуусах гэж байна',
            'url'           => '/my/training/lessons/'.$this->lesson->id,
        ];
    }

    /** Хугацаа дуусахад үлдсэн (эсвэл хэтэрсэн) бүхэл хоног. */
    protected function days(): int
    {
        if (! $this->lesson->due_at) {
            return 0;
        }

        // Carbon 3 нь бутархай, тэмдэгтэй утга буцаадаг тул абсолют болгоно
        return (int) abs((float) now()->diffInDays($this->lesson->due_at));
    }
}
