<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SocialFlowNode extends Model
{
    protected $table = 'social_flow_nodes';

    public const TYPE_MESSAGE = 'message';

    public const TYPE_IMAGE = 'image';

    public const TYPE_QUESTION = 'question';

    public const TYPE_ACTION = 'action';

    public const TYPE_CONDITION = 'condition';

    public const TYPE_DELAY = 'delay';

    public const TYPE_CAROUSEL = 'carousel';

    public const TYPE_MEDIA = 'media';

    public const TYPE_FILE = 'file';

    public const TYPE_TYPING = 'typing';

    protected $fillable = [
        'flow_id',
        'type',
        'key',
        'keywords',
        'title',
        'body',
        'image_url',
        'cards',
        'next_node_id',
        'save_field',
        'action_type',
        'action_field',
        'action_value',
        'action_flow_id',
        'delay_seconds',
        'condition_type',
        'condition_field',
        'condition_value',
        'yes_node_id',
        'no_node_id',
        'is_entry',
        'position_x',
        'position_y',
        'sent_count',
        'sort_order',
    ];

    protected $casts = [
        'is_entry' => 'boolean',
        'cards' => 'array',
        'keywords' => 'array',
        'position_x' => 'integer',
        'position_y' => 'integer',
        'delay_seconds' => 'integer',
        'sent_count' => 'integer',
        'sort_order' => 'integer',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(SocialFlow::class, 'flow_id');
    }

    public function buttons(): HasMany
    {
        return $this->hasMany(SocialFlowButton::class, 'node_id')->orderBy('sort_order');
    }

    public function nextNode(): BelongsTo
    {
        return $this->belongsTo(SocialFlowNode::class, 'next_node_id');
    }
}
