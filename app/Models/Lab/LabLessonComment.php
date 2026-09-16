<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Хичээлийн сэтгэгдэл. parent_id байвал өөр сэтгэгдлийн хариу. */
class LabLessonComment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'lab_lesson_id', 'user_id', 'parent_id', 'body', 'is_pinned', 'is_hidden',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'is_hidden' => 'boolean',
    ];

    /**
     * Reaction нь morphTo учир cascade-д хамрагдахгүй. Зөөлөн устгал дээр
     * хэвээр үлдээнэ (сэргээж болно), бүрмөсөн устгах үед л арилгана.
     */
    protected static function booted(): void
    {
        static::forceDeleted(fn (self $comment) => $comment->reactions()->delete());
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(LabLesson::class, 'lab_lesson_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->oldest();
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(LabReaction::class, 'reactable');
    }
}
