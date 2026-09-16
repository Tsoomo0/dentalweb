<?php

namespace App\Models\Lab;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Асуултын сонголт. is_correct нь ажилтан руу ХЭЗЭЭ Ч илгээгдэхгүй. */
class LabExamOption extends Model
{
    protected $fillable = ['lab_exam_question_id', 'body', 'is_correct', 'order'];

    protected $casts = [
        'is_correct' => 'boolean',
        'order'      => 'integer',
    ];

    protected $hidden = ['is_correct'];

    public function question(): BelongsTo
    {
        return $this->belongsTo(LabExamQuestion::class, 'lab_exam_question_id');
    }
}
