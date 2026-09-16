<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Ажилтны нэг удаагийн шалгалтын оролдлого. */
class LabExamAttempt extends Model
{
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_SUBMITTED   = 'submitted';   // задгай асуулт үнэлэгдэхийг хүлээж буй
    public const STATUS_GRADED      = 'graded';

    protected $fillable = [
        'lab_exam_id', 'user_id', 'attempt_no',
        'started_at', 'expires_at', 'submitted_at',
        'score', 'max_score', 'percent', 'is_passed',
        'status', 'question_order', 'graded_by', 'graded_at',
    ];

    protected $casts = [
        'attempt_no'     => 'integer',
        'started_at'     => 'datetime',
        'expires_at'     => 'datetime',
        'submitted_at'   => 'datetime',
        'score'          => 'decimal:2',
        'max_score'      => 'decimal:2',
        'percent'        => 'integer',
        'is_passed'      => 'boolean',
        'question_order' => 'array',
        'graded_at'      => 'datetime',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(LabExam::class, 'lab_exam_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(LabExamAnswer::class, 'lab_exam_attempt_id');
    }

    public function grader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }

    /** Хугацаа дууссан эсэх — сервер талын цагаар. */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /** Үлдсэн секунд. null → хугацаагүй шалгалт. */
    public function secondsLeft(): ?int
    {
        if ($this->expires_at === null) {
            return null;
        }

        // Carbon 3 нь float буцаадаг тул шууд int болгоно
        return max(0, (int) now()->diffInSeconds($this->expires_at, false));
    }
}
