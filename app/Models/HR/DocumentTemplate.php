<?php

namespace App\Models\HR;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Гэрээ / ажлын байрны тодорхойлолтын загвар.
 * Загварын биед {{placeholder}} бичиж болох ба ажилтанд илгээх үед
 * DocumentRenderer тухайн ажилтны мэдээллээр орлуулж хувилна.
 */
class DocumentTemplate extends Model
{
    use SoftDeletes;

    protected $table = 'hr_document_templates';

    protected $fillable = [
        'type', 'title', 'code', 'position_id', 'description', 'body',
        'requires_employer_signature', 'requires_employee_signature',
        'is_active', 'sort_order', 'created_by',
    ];

    protected $casts = [
        'requires_employer_signature' => 'boolean',
        'requires_employee_signature' => 'boolean',
        'is_active' => 'boolean',
    ];

    /** Баримтын төрлүүд — ажилтан руу илгээх боломжтой бүх маягт. */
    public const TYPES = [
        'job_description' => 'Ажлын байрны тодорхойлолт',
        'employment' => 'Хөдөлмөрийн гэрээ',
        'liability' => 'Эд хөрөнгийн бүрэн хариуцлагын гэрээ',
        'nda' => 'Нууц хадгалах гэрээ',
        'training' => 'Сургалтын гэрээ',
        'other' => 'Бусад',
    ];

    public static function typeLabel(?string $type): string
    {
        return self::TYPES[$type] ?? 'Бусад';
    }

    public function getTypeLabelAttribute(): string
    {
        return self::typeLabel($this->type);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(EmployeeDocument::class, 'template_id');
    }
}
