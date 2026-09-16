<?php

namespace App\Models\Lab;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/** Хичээл эсвэл сэтгэгдэл дээрх reaction. Нэг хүн нэг зүйл дээр ганц. */
class LabReaction extends Model
{
    /** Боломжит төрлүүд: DB утга => emoji. */
    public const TYPES = [
        'like' => '👍',
        'love' => '❤️',
        'wow'  => '😮',
        'clap' => '👏',
    ];

    protected $fillable = ['reactable_type', 'reactable_id', 'user_id', 'type'];

    public function reactable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
