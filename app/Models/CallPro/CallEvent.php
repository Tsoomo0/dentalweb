<?php

namespace App\Models\CallPro;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'call_id', 'event', 'unique_id', 'payload', 'source', 'ip',
        'processed', 'error', 'received_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'processed' => 'boolean',
        'received_at' => 'datetime',
    ];

    public function call(): BelongsTo
    {
        return $this->belongsTo(Call::class);
    }
}
