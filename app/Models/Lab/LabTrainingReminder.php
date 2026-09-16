<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Илгээгдсэн сургалтын сануулгын бүртгэл — давхардлаас сэргийлнэ. */
class LabTrainingReminder extends Model
{
    /** Эцсийн хугацаа ойртлоо. */
    public const KIND_DUE_SOON = 'due_soon';

    /** Эцсийн хугацаа хэтэрлээ. */
    public const KIND_OVERDUE = 'overdue';

    protected $fillable = ['user_id', 'lab_lesson_id', 'kind', 'due_at', 'sent_at'];

    protected $casts = [
        'due_at'  => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(LabLesson::class, 'lab_lesson_id');
    }
}
