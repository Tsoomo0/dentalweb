<?php

namespace App\Models;

use App\Models\HR\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Нэг лаб захиалгын нэг буцаалтын мөчлөг.
 *
 * Захиалга дахин буцаагдвал шинэ мөр үүснэ (attempt 1, 2, 3…), өмнөх нь
 * хэвээр үлдэнэ — ингэж "ямар ажил хэр их буцаагддаг" гэдгийг харна.
 */
class LabOrderReturn extends Model
{
    protected $fillable = [
        'lab_order_id', 'attempt', 'reason',
        'returned_at', 'returned_by',
        'ready_date', 'closed_at', 'cancelled_at',
    ];

    protected $casts = [
        'attempt'      => 'integer',
        'returned_at'  => 'datetime',
        'ready_date'   => 'date:Y-m-d',
        'closed_at'    => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function labOrder(): BelongsTo
    {
        return $this->belongsTo(LabOrder::class);
    }

    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by');
    }

    /** Энэ мөчлөгийг нугалсан ажилтнууд */
    public function benders(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'lab_order_return_employee', 'lab_order_return_id', 'employee_id')
            ->withPivotValue('role', 'bender')
            ->withTimestamps();
    }

    /** Энэ мөчлөгийг өнгөлсөн ажилтнууд */
    public function polishers(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'lab_order_return_employee', 'lab_order_return_id', 'employee_id')
            ->withPivotValue('role', 'polisher')
            ->withTimestamps();
    }

    /** sent | ready | done | cancelled */
    public function getStatusAttribute(): string
    {
        return match (true) {
            $this->cancelled_at !== null => 'cancelled',
            $this->closed_at !== null    => LabOrder::RETURN_DONE,
            $this->ready_date !== null   => LabOrder::RETURN_READY,
            default                      => LabOrder::RETURN_SENT,
        };
    }

    /** Хараахан хаагдаагүй, цуцлагдаагүй */
    public function getIsOpenAttribute(): bool
    {
        return $this->closed_at === null && $this->cancelled_at === null;
    }
}
