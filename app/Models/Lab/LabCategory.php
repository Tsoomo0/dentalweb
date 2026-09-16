<?php

namespace App\Models\Lab;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Str;

/**
 * Сургалтын ангилал — сургалтуудыг сэдвээр бүлэглэнэ.
 * Жишээ: Керамик, Металл каркас, CAD/CAM, Ортодонт.
 */
class LabCategory extends Model
{
    /** UI kit-ийн Tone утгууд — каталог дээр ангилал бүр өөрийн өнгөтэй. */
    public const COLORS = ['violet', 'emerald', 'amber', 'rose', 'sky', 'indigo', 'orange', 'slate'];

    /** Сонгож болох дүрснүүд (frontend дээрх бүртгэлтэй таарна). */
    public const ICONS = [
        'folder', 'layers', 'gem', 'cog', 'scan', 'braces', 'flask', 'wrench', 'sparkles',
    ];

    protected $fillable = ['name', 'slug', 'description', 'color', 'icon', 'order', 'is_active'];

    protected $casts = [
        'order'     => 'integer',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $category) {
            $category->slug ??= static::uniqueSlug($category->name);
        });
    }

    public static function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: 'angilal';
        $slug = $base;
        $i    = 2;

        while (static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }

    public function courses(): HasMany
    {
        return $this->hasMany(LabCourse::class)->orderBy('order')->orderBy('id');
    }

    public function lessons(): HasManyThrough
    {
        return $this->hasManyThrough(LabLesson::class, LabCourse::class, 'lab_category_id', 'lab_course_id');
    }
}
