<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    protected $fillable = [
        'employee_id', 'date', 'checked_in_at', 'checked_out_at', 'notes',
        'check_in_source', 'check_out_source',
        'check_in_lat', 'check_in_lng', 'check_out_lat', 'check_out_lng',
    ];

    protected $casts = [
        'date' => 'date',
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function getWorkedMinutesAttribute(): int
    {
        if (! $this->checked_in_at || ! $this->checked_out_at) {
            return 0;
        }

        // Цагийг минутаар харуулдаг тул (17:23 → 18:24 = 61м) секундийг хасаж тооцно —
        // эс тэгвээс 17:23:19 → 18:24:10 нь 60.85 → "1ц" болж дэлгэцийнхтэй зөрнө.
        return (int) $this->checked_in_at->copy()->startOfMinute()
            ->diffInMinutes($this->checked_out_at->copy()->startOfMinute());
    }
}
