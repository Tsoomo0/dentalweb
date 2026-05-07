<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DailySheet extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'branch_id',
        'date',
        'receptionist_id',
        'status',
        'submitted_at',
    ];

    protected $casts = [
        'date'         => 'date:Y-m-d',
        'submitted_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function receptionist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receptionist_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(DailySheetEntry::class)->orderBy('row_order');
    }
}
