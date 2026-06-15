<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialFlowButton extends Model
{
    protected $table = 'social_flow_buttons';

    public const ACTION_NEXT_NODE = 'next_node';

    public const ACTION_FLOW_START = 'flow_start';

    public const ACTION_HANDOFF = 'handoff';

    public const ACTION_URL = 'url';

    public const ACTION_WEB_FORM = 'web_form';

    public const ACTION_CALL = 'call';

    protected $fillable = [
        'node_id',
        'label',
        'action',
        'is_quick_reply',
        'target_node_id',
        'target_flow_id',
        'target_form_id',
        'url',
        'phone',
        'click_count',
        'sort_order',
    ];

    protected $casts = [
        'is_quick_reply' => 'boolean',
        'click_count' => 'integer',
        'sort_order' => 'integer',
    ];

    public function node(): BelongsTo
    {
        return $this->belongsTo(SocialFlowNode::class, 'node_id');
    }
}
