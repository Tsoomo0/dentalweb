<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeExitChecklist extends Model
{
    use SoftDeletes;

    protected $table = 'employee_exit_checklists';

    protected $fillable = [
        'employee_id', 'exit_date', 'exit_type', 'reason',
        'notice_date', 'replacement_plan',
        // Property
        'item_equipment_returned', 'item_badge_returned', 'item_keys_returned',
        'item_books_returned', 'item_uniform_returned', 'notes_property',
        // IT
        'item_system_access_revoked', 'item_email_deactivated', 'item_files_transferred', 'notes_it',
        // Finance
        'item_final_salary_processed', 'item_advances_settled',
        'item_insurance_notified', 'item_tax_notified', 'notes_finance',
        // Management
        'item_handover_completed', 'item_exit_interview_done', 'item_certificate_issued',
        'eligible_for_rehire', 'exit_interview_notes', 'notes_general',
        // Status
        'status', 'completed_by', 'completed_at',
    ];

    protected $casts = [
        'exit_date' => 'date',
        'notice_date' => 'date',
        'completed_at' => 'datetime',
        'eligible_for_rehire' => 'boolean',
        'item_equipment_returned' => 'boolean',
        'item_badge_returned' => 'boolean',
        'item_keys_returned' => 'boolean',
        'item_books_returned' => 'boolean',
        'item_uniform_returned' => 'boolean',
        'item_system_access_revoked' => 'boolean',
        'item_email_deactivated' => 'boolean',
        'item_files_transferred' => 'boolean',
        'item_final_salary_processed' => 'boolean',
        'item_advances_settled' => 'boolean',
        'item_insurance_notified' => 'boolean',
        'item_tax_notified' => 'boolean',
        'item_handover_completed' => 'boolean',
        'item_exit_interview_done' => 'boolean',
        'item_certificate_issued' => 'boolean',
    ];

    public static array $allItems = [
        'item_equipment_returned', 'item_badge_returned', 'item_keys_returned',
        'item_books_returned', 'item_uniform_returned',
        'item_system_access_revoked', 'item_email_deactivated', 'item_files_transferred',
        'item_final_salary_processed', 'item_advances_settled',
        'item_insurance_notified', 'item_tax_notified',
        'item_handover_completed', 'item_exit_interview_done', 'item_certificate_issued',
    ];

    public function completedCount(): int
    {
        return collect(self::$allItems)->filter(fn ($k) => $this->{$k})->count();
    }

    public function totalItems(): int
    {
        return count(self::$allItems);
    }

    public function progressPercent(): int
    {
        return (int) round(($this->completedCount() / $this->totalItems()) * 100);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
