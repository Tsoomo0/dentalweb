<?php

namespace App\Models\Bot;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class BotFlow extends Model
{
    use SoftDeletes;

    protected $table = 'bot_flows';

    protected $fillable = [
        'key',
        'name',
        'description',
        'icon',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function nodes(): HasMany
    {
        return $this->hasMany(BotNode::class, 'flow_id');
    }

    public function entryNode(): HasOne
    {
        return $this->hasOne(BotNode::class, 'flow_id')->where('is_welcome', true);
    }
}
