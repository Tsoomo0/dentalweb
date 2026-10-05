<?php

namespace App\Models\HR;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Ажилтан "энэ өдөр боломжгүй" гэж тэмдэглэсэн өдөр. */
class ScheduleAvailability extends Model
{
    protected $fillable = ['employee_id', 'date', 'note'];

    protected $casts = ['date' => 'date'];

    /** Shift-тэй адил Y-m-d хэлбэрээр хадгална. */
    protected function date(): Attribute
    {
        return Attribute::make(set: fn ($value) => $value ? Carbon::parse($value)->toDateString() : null);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
