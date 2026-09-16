<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Ажилтанд илгээсэн гэрээ / ажлын байрны тодорхойлолт.
 *
 * Урсгал:
 *   draft → (захирал гарын үсэг зурна) → pending_employee
 *         → (ажилтан гарын үсэг зурна) → completed → 2 талд и-мэйлээр PDF очно
 */
class EmployeeDocument extends Model
{
    use SoftDeletes;

    protected $table = 'hr_employee_documents';

    protected $fillable = [
        'employee_id', 'template_id', 'type', 'title', 'doc_number',
        'body', 'variables', 'status',
        'employer_name', 'employer_position', 'employer_user_id',
        'employer_signature', 'employer_signed_at', 'employer_stamp',
        'employee_name', 'employee_position',
        'employee_signature', 'employee_signed_at',
        'effective_date', 'expires_at', 'sent_at', 'completed_at',
        'delivered_at', 'delivery_error', 'delivered_to',
        'pdf_path', 'notes', 'decline_reason', 'created_by',
    ];

    protected $casts = [
        'variables' => 'array',
        'effective_date' => 'date',
        'expires_at' => 'date',
        'employer_signed_at' => 'datetime',
        'employee_signed_at' => 'datetime',
        'sent_at' => 'datetime',
        'completed_at' => 'datetime',
        'delivered_at' => 'datetime',
        'delivered_to' => 'array',
    ];

    public const STATUSES = [
        'draft' => 'Гэрээ үүссэн',
        'pending_employer' => 'Захирлын гарын үсэг хүлээж буй',
        'pending_employee' => 'Ажилтны гарын үсэг хүлээж буй',
        'completed' => 'Баталгаажсан',
        'declined' => 'Ажилтан татгалзсан',
        'cancelled' => 'Цуцлагдсан',
    ];

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function getTypeLabelAttribute(): string
    {
        return DocumentTemplate::typeLabel($this->type);
    }

    /** Ажилтан гарын үсэг зурах ээлж дээрээ байгаа эсэх. */
    public function awaitsEmployee(): bool
    {
        return $this->status === 'pending_employee';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class, 'template_id');
    }

    public function employerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
