<?php

namespace App\Models\Social;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SocialFlow extends Model
{
    protected $table = 'social_flows';

    public const TRIGGER_WELCOME = 'welcome';

    public const TRIGGER_KEYWORD = 'keyword';

    public const TRIGGER_DEFAULT = 'default';

    protected $fillable = [
        'social_account_id',
        'key',
        'name',
        'icon',
        'trigger_type',
        'keywords',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'keywords' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function nodes(): HasMany
    {
        return $this->hasMany(SocialFlowNode::class, 'flow_id');
    }

    public function entryNode(): HasOne
    {
        return $this->hasOne(SocialFlowNode::class, 'flow_id')->where('is_entry', true);
    }
}
