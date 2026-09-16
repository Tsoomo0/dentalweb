<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Хэрэглэгчийн хадгалсан гарын үсэг.
 * Гэрээ, ажлын байрны тодорхойлолт болон бусад баримтад дахин ашиглана.
 */
class UserSignature extends Model
{
    protected $fillable = [
        'user_id', 'label', 'image', 'source', 'is_default', 'last_used_at',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'last_used_at' => 'datetime',
    ];

    /** Нэг хэрэглэгчид байж болох хамгийн их гарын үсгийн тоо. */
    public const MAX_PER_USER = 8;

    /** Зөвшөөрөгдөх зургийн форматыг шалгана. */
    public static function isValidImage(?string $value): bool
    {
        return is_string($value)
            && (bool) preg_match('~^data:image/(png|jpeg);base64,[a-z0-9+/=\s]+$~i', $value);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
