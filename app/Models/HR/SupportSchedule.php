<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportSchedule extends Model
{
    protected $fillable = [
        'employee_id', 'date', 'shift_type',
        'start_time', 'end_time', 'note', 'created_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    /** Туслах ажилтны ээлжүүд. */
    public const SHIFTS = [
        'morning'   => 'Өглөө',
        'afternoon' => 'Орой',
        'full'      => 'Бүтэн',
        'off'       => 'Амралт',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
