<?php

namespace App\Notifications;

use App\Models\Lab\LabExamAttempt;
use Illuminate\Notifications\Notification;

/** Шалгалтын үнэлгээ гарлаа — оролдлого өгсөн ажилтанд. */
class LabExamGraded extends Notification
{
    public function __construct(public readonly LabExamAttempt $attempt) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'lab_exam_attempt_id' => $this->attempt->id,
            'lab_exam_id' => $this->attempt->lab_exam_id,
            'exam_title' => $this->attempt->exam?->title,
            'score' => (float) $this->attempt->score,
            'max_score' => (float) $this->attempt->max_score,
            'percent' => $this->attempt->percent,
            'is_passed' => $this->attempt->is_passed,
            'url' => '/my/training/exams/'.$this->attempt->lab_exam_id.'/result/'.$this->attempt->id,
        ];
    }
}
