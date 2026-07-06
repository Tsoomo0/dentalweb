<?php

namespace App\Models\HR;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkScheduleDay extends Model
{
    protected $fillable = ['branch_id', 'date', 'tasks'];

    protected $casts = [
        'date' => 'date',
        'tasks' => 'array',
    ];

    /** Хийх ажлын төрлүүд (PDF доод хэсэг). */
    public const TASK_TYPES = [
        'card_produce' => 'Карт, загвар гаргах',
        'card_collect' => 'Карт, загвар хураах',
        'model_room'   => 'Загварын өрөө хариуцах',
        'print_cover'  => 'Картны нүүр, хавсралт хэвлэх',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
