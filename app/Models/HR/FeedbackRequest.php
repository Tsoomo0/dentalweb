<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FeedbackRequest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'type', 'subject', 'body',
        'status', 'admin_response', 'reviewed_by', 'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'suggestion' => 'Санал',
            'request' => 'Хүсэлт',
            'complaint' => 'Гомдол',
            default => $this->type,
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Хүлээгдэж байна',
            'reviewed' => 'Хянагдсан',
            'resolved' => 'Шийдвэрлэсэн',
            'rejected' => 'Татгалзсан',
            default => $this->status,
        };
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isResolved(): bool
    {
        return $this->status === 'resolved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}
