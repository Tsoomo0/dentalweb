<?php

namespace App\Models\Lab;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Сургалт доторх бүлэг — хичээлүүдийг сэдэвчилсэн хэсэг болгон хуваана.
 * Жишээ: "1-р бүлэг: Бэлтгэл", "2-р бүлэг: Хэвлэлт".
 */
class LabSection extends Model
{
    protected $fillable = ['lab_course_id', 'title', 'order'];

    protected $casts = ['order' => 'integer'];

    public function course(): BelongsTo
    {
        return $this->belongsTo(LabCourse::class, 'lab_course_id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(LabLesson::class)->orderBy('order')->orderBy('id');
    }
}
