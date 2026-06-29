<?php

namespace App\Models;

use App\Events\DailySheetUpdated;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DailySheet extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        // Аливаа өөрчлөлт (үүсгэх/засах/устгах/сэргээх) → real-time мэдэгдэл
        $notify = fn (DailySheet $sheet) => DailySheetUpdated::mark($sheet->branch_id, $sheet->date);
        static::saved($notify);
        static::deleted($notify);
        static::restored($notify);
    }

    protected $fillable = [
        'branch_id',
        'date',
        'receptionist_id',
        'status',
        'submitted_at',
        'supplies',
        'morning_submitted_at',
        'morning_receptionist_id',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'submitted_at' => 'datetime',
        'morning_submitted_at' => 'datetime',
        'supplies' => 'array',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function receptionist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receptionist_id');
    }

    public function morningReceptionist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'morning_receptionist_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(DailySheetEntry::class)->orderBy('row_order');
    }
}
