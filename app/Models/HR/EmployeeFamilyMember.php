<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeFamilyMember extends Model
{
    protected $fillable = [
        'employee_id', 'last_name', 'first_name',
        'phone', 'relationship', 'birth_date', 'employment_status',
    ];

    protected $casts = ['birth_date' => 'date'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
