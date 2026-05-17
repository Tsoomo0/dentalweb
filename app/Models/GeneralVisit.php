<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GeneralVisit extends Model
{
    protected $fillable = ['patient_id', 'doctor_id', 'visit_date', 'data'];

    protected $casts = [
        'visit_date' => 'date',
        'data' => 'array',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
