<?php

namespace App\Models\Lab;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Оролдлого дахь нэг асуултын хариулт. */
class LabExamAnswer extends Model
{
    protected $fillable = [
        'lab_exam_attempt_id', 'lab_exam_question_id',
        'selected_option_ids', 'text_answer',
        'is_correct', 'points_awarded', 'feedback',
    ];

    protected $casts = [
        'selected_option_ids' => 'array',
        'is_correct'          => 'boolean',
        'points_awarded'      => 'decimal:2',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(LabExamAttempt::class, 'lab_exam_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(LabExamQuestion::class, 'lab_exam_question_id');
    }
}
