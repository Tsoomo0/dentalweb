<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OverpaidUsage extends Model
{
    protected $fillable = [
        'source_entry_id',
        'target_receipt',
        'amount',
        'method',
        'used_by',
    ];

    protected $casts = [
        'amount' => 'integer',
    ];

    public function sourceEntry(): BelongsTo
    {
        return $this->belongsTo(DailySheetEntry::class, 'source_entry_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }
}
