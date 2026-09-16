<?php

namespace App\Models\Lab;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/** Шалгалтын нэг асуулт. */
class LabExamQuestion extends Model
{
    public const TYPE_SINGLE    = 'single';     // нэг зөв хариулт
    public const TYPE_MULTIPLE  = 'multiple';   // олон зөв хариулт
    public const TYPE_TRUEFALSE = 'truefalse';  // үнэн / худал
    public const TYPE_TEXT      = 'text';       // задгай — админ гараар үнэлнэ

    public const TYPES = [
        self::TYPE_SINGLE    => 'Нэг зөв хариулт',
        self::TYPE_MULTIPLE  => 'Олон зөв хариулт',
        self::TYPE_TRUEFALSE => 'Үнэн / Худал',
        self::TYPE_TEXT      => 'Задгай хариулт',
    ];

    protected $fillable = [
        'lab_exam_id', 'type', 'body', 'image_path', 'points', 'order', 'explanation',
    ];

    protected $casts = [
        'points' => 'integer',
        'order'  => 'integer',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(LabExam::class, 'lab_exam_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(LabExamOption::class)->orderBy('order')->orderBy('id');
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? Storage::url($this->image_path) : null;
    }

    /** Автоматаар үнэлэгдэх эсэх — задгай хариулт л гараар үнэлэгдэнэ. */
    public function isAutoGraded(): bool
    {
        return $this->type !== self::TYPE_TEXT;
    }
}
