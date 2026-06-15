<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialCommentRule extends Model
{
    protected $table = 'social_comment_rules';

    public const MATCH_ANY = 'any';

    public const MATCH_CONTAINS = 'contains';

    public const MATCH_EXACT = 'exact';

    protected $fillable = [
        'social_account_id',
        'name',
        'post_id',
        'match_type',
        'keywords',
        'public_reply',
        'dm_template',
        'dm_flow_id',
        'dm_node_id',
        'is_active',
        'matched_count',
        'sort_order',
    ];

    protected $casts = [
        'keywords' => 'array',
        'is_active' => 'boolean',
        'matched_count' => 'integer',
        'sort_order' => 'integer',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class, 'social_account_id');
    }

    public function dmFlow(): BelongsTo
    {
        return $this->belongsTo(SocialFlow::class, 'dm_flow_id');
    }

    public function dmNode(): BelongsTo
    {
        return $this->belongsTo(SocialFlowNode::class, 'dm_node_id');
    }

    /** Өгөгдсөн коммент текст энэ дүрэмд тохирох эсэх. */
    public function matches(string $commentText): bool
    {
        if ($this->match_type === self::MATCH_ANY) {
            return true;
        }

        $needle = mb_strtolower(trim($commentText));

        foreach ($this->keywords ?? [] as $kw) {
            $kw = mb_strtolower(trim((string) $kw));
            if ($kw === '') {
                continue;
            }

            if ($this->match_type === self::MATCH_EXACT && $needle === $kw) {
                return true;
            }

            if ($this->match_type === self::MATCH_CONTAINS && str_contains($needle, $kw)) {
                return true;
            }
        }

        return false;
    }
}
