<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrthoApplianceRecord extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'doctor_id', 'appliance_type', 'archive_code', 'card_number', 'register_number',
        'last_name', 'first_name', 'phone',
        'attached_date', 'removed_date', 'notes', 'created_by',
    ];

    protected $casts = [
        'attached_date' => 'date',
        'removed_date'  => 'date',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function getIsActiveAttribute(): bool
    {
        return $this->removed_date === null;
    }
}
