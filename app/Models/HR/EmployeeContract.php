<?php

namespace App\Models\HR;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ажилтны хөдөлмөрийн гэрээ.
 *
 * Хоёр эх үүсвэртэй:
 *   1. Гараар оруулсан — сканнердсан файл (file_path)
 *   2. Цахим гэрээ — «Гэрээ» хэсэгт 2 тал гарын үсэг зурж баталгаажсан
 *      баримтаас автоматаар үүснэ (document_id)
 */
class EmployeeContract extends Model
{
    /** Ажилтны гэрээ болж буулгахгүй баримтын төрлүүд. */
    public const NON_CONTRACT_TYPES = ['job_description'];

    protected $fillable = [
        'employee_id', 'document_id', 'contract_type', 'title', 'file_path',
        'start_date', 'end_date', 'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** Гарын үсэг зурагдсан цахим гэрээ — гараар оруулсан бол null. */
    public function document(): BelongsTo
    {
        return $this->belongsTo(EmployeeDocument::class, 'document_id');
    }

    public function isSigned(): bool
    {
        return $this->document_id !== null;
    }

    /** Гараар хавсаргасан сканнердсан файлын холбоос. */
    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? asset('storage/'.$this->file_path) : null;
    }

    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (! $this->end_date) {
            return null;
        }

        return now()->diffInDays($this->end_date, false);
    }
}
