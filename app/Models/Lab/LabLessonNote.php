<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ажилтны цагтай тэмдэглэл — видеоны тодорхой агшинд холбогдоно.
 * Тэмдэглэл нь зөвхөн бичсэн хүнд харагдана (хувийн).
 */
class LabLessonNote extends Model
{
    protected $fillable = ['lab_lesson_id', 'user_id', 'position_seconds', 'body'];

    protected $casts = ['position_seconds' => 'integer'];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(LabLesson::class, 'lab_lesson_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** "12:30" хэлбэрийн цагийн тэмдэг. */
    public function getStampAttribute(): string
    {
        $m = intdiv($this->position_seconds, 60);
        $s = $this->position_seconds % 60;

        return sprintf('%d:%02d', $m, $s);
    }
}
