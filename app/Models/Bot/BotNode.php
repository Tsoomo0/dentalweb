<?php

namespace App\Models\Bot;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BotNode extends Model
{
    use SoftDeletes;

    protected $table = 'bot_nodes';

    protected $fillable = [
        'flow_id',
        'key',
        'title',
        'body',
        'data_source',
        'is_welcome',
    ];

    protected $casts = [
        'is_welcome' => 'boolean',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(BotFlow::class, 'flow_id');
    }

    public function buttons(): HasMany
    {
        return $this->hasMany(BotButton::class, 'node_id')->orderBy('sort_order');
    }
}
