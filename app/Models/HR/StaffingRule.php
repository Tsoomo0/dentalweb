<?php

namespace App\Models\HR;

use App\Models\Branch;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Салбар × албан тушаалын өдрийн доод хүн хүч. */
class StaffingRule extends Model
{
    protected $fillable = ['branch_id', 'position_id', 'min_count', 'weekdays'];

    protected $casts = [
        'weekdays' => 'array',
        'min_count' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function appliesOn(CarbonInterface $date): bool
    {
        return empty($this->weekdays) || in_array($date->dayOfWeekIso, array_map('intval', $this->weekdays), true);
    }
}
