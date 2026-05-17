<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeWarning extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'issued_by', 'type', 'severity', 'title', 'description',
        'incident_date', 'action', 'action_detail', 'status', 'employee_response', 'acknowledged_at',
    ];

    protected $casts = [
        'incident_date' => 'date',
        'acknowledged_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'warning' => 'Сануулга',
            'violation' => 'Зөрчил',
            default => $this->type,
        };
    }

    public function getSeverityLabelAttribute(): string
    {
        return match ($this->severity) {
            'low' => 'Бага',
            'medium' => 'Дунд',
            'high' => 'Өндөр',
            default => $this->severity,
        };
    }

    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'written_warning' => 'Бичгээр сануулга',
            'salary_deduction' => 'Цалин суутгал',
            'suspension' => 'Түр чөлөөлөх',
            'termination' => 'Ажлаас халах',
            'other' => 'Бусад',
            default => $this->action,
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'sent' => 'Илгээгдсэн',
            'acknowledged' => 'Хүлээн зөвшөөрсөн',
            default => $this->status,
        };
    }

    public function isPending(): bool
    {
        return $this->status === 'sent';
    }

    public function isAcknowledged(): bool
    {
        return $this->status === 'acknowledged';
    }
}
