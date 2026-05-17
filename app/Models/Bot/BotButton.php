<?php

namespace App\Models\Bot;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BotButton extends Model
{
    protected $table = 'bot_buttons';

    public const ACTION_NEXT_NODE = 'next_node';

    public const ACTION_FLOW_START = 'flow_start';

    public const ACTION_HANDOFF = 'handoff';

    public const ACTION_URL = 'url';

    public const ACTION_BACK = 'back';

    public const ACTION_CLOSE = 'close';

    protected $fillable = [
        'node_id',
        'label',
        'icon',
        'action',
        'target_node_id',
        'target_flow_id',
        'target_url',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function node(): BelongsTo
    {
        return $this->belongsTo(BotNode::class, 'node_id');
    }

    public function targetNode(): BelongsTo
    {
        return $this->belongsTo(BotNode::class, 'target_node_id');
    }

    public function targetFlow(): BelongsTo
    {
        return $this->belongsTo(BotFlow::class, 'target_flow_id');
    }
}
