<?php

namespace App\Models\HR;

use App\Models\Branch;
use App\Models\Doctor;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_number', 'user_id', 'photo',
        // Хувийн
        'last_name', 'first_name', 'register_number', 'birth_date', 'gender',
        'family_name', 'ethnicity', 'birth_place', 'blood_type',
        'driver_license', 'military_service',
        // Боловсрол
        'education_degree', 'education_school', 'education_major',
        // Холбоо барих
        'phone', 'email', 'address',
        // Яаралтай
        'emergency_name', 'emergency_phone', 'emergency_relation',
        // Ажил
        'branch_id', 'position_id', 'salary', 'hired_date',
        'probation_end_date', 'status',
        // Амралт
        'vacation_extra_days', 'ndsh_years',
        // Санхүү
        'bank_name', 'bank_account', 'bank_account_name',
        // Гэр бүл
        'is_married', 'has_children', 'children_count',
        'notes',
        // Нэмэлт портал нэвтрэх эрх (жишээ: сувилагч → ['reception'])
        'extra_portals',
        // Хуваарь гаргах эрх — албан тушаалын id-ууд эсвэл ['*'] (бүгд), өөрийн салбарын хэмжээнд
        'schedule_permissions',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'hired_date' => 'date',
        'probation_end_date' => 'date',
        'military_service' => 'boolean',
        'is_married' => 'boolean',
        'has_children' => 'boolean',
        'salary' => 'decimal:2',
        'extra_portals' => 'array',
        'schedule_permissions' => 'array',
    ];

    /**
     * Хуваарийг нь гаргаж болох албан тушаалууд (өөрийн салбарт).
     * null = бүх албан тушаал ('*'), [] = эрхгүй.
     *
     * @return list<int>|null
     */
    public function schedulablePositionIds(): ?array
    {
        $perms = $this->schedule_permissions ?? [];
        if (in_array('*', $perms, true)) {
            return null;
        }

        return array_values(array_map('intval', array_filter($perms, fn ($p) => ctype_digit((string) $p))));
    }

    /** Ямар нэг хуваарь гаргах эрхтэй эсэх. */
    public function canManageAnySchedule(): bool
    {
        return ! empty($this->schedule_permissions);
    }

    /**
     * Тухайн портал руу нэвтрэх эрхтэй эсэхийг шалгана.
     * Үндсэн position.portal эсвэл extra_portals аль аль нь зөвшөөрнө.
     */
    public function canAccessPortal(string $portal): bool
    {
        if ($this->position?->portal === $portal) {
            return true;
        }
        $extras = $this->extra_portals ?? [];
        return is_array($extras) && in_array($portal, $extras, true);
    }

    // ── Relations ────────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(EmployeeContract::class)->orderByDesc('start_date');
    }

    public function activeContract(): HasMany
    {
        return $this->hasMany(EmployeeContract::class)
            ->whereNull('end_date')
            ->orWhere('end_date', '>=', now());
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(EmployeeLicense::class)->orderByDesc('end_date');
    }

    public function familyMembers(): HasMany
    {
        return $this->hasMany(EmployeeFamilyMember::class);
    }

    public function doctor(): HasOne
    {
        return $this->hasOne(Doctor::class, 'employee_id');
    }

    /**
     * Ажилладаг бүх салбар: үндсэн салбар + эмчийн «Мөн ажилладаг салбарууд» (branch_doctor).
     * Ирцийн төхөөрөмж тааруулах, салбараар шүүхэд хэрэглэнэ. `doctor.branches`-ийг урьдчилан ачаалбал зохино.
     *
     * @return list<int>
     */
    public function workBranchIds(): array
    {
        $ids = $this->branch_id ? [(int) $this->branch_id] : [];

        foreach ($this->doctor?->branches ?? [] as $branch) {
            $ids[] = (int) $branch->id;
        }

        return array_values(array_unique($ids));
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function vacationRequests(): HasMany
    {
        return $this->hasMany(VacationRequest::class);
    }

    public function exitChecklist(): HasOne
    {
        return $this->hasOne(EmployeeExitChecklist::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class);
    }

    public function schedulePattern(): HasOne
    {
        return $this->hasOne(SchedulePattern::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return $this->last_name.' '.$this->first_name;
    }

    /** Овгийн эхний үсэг + бүтэн нэр — "А.Цолмон" (эмчийн нэртэй ижил хэлбэр) */
    public function getShortNameAttribute(): string
    {
        $last  = trim((string) $this->last_name);
        $first = trim((string) $this->first_name);

        if ($last === '') {
            return $first;
        }

        return mb_substr($last, 0, 1).'.'.$first;
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo ? asset('storage/'.$this->photo) : null;
    }

    /**
     * Хөдөлмөрийн хуулийн 79-р зүйлийн дагуу НДШ жилээр тооцсон үндсэн ажлын өдөр
     * 0-4 жил → 15, 5-9 → 16, 10-14 → 17, 15-19 → 18, 20-24 → 19, 25-29 → 20, 30+ → 21
     */
    public function getVacationDaysAttribute(): int
    {
        return min(21, 15 + intdiv((int) ($this->ndsh_years ?? 0), 5));
    }

    // ── Auto employee number ──────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Employee $employee) {
            $last = static::withTrashed()->orderByDesc('id')->value('employee_number');
            $next = $last ? (int) substr($last, 4) + 1 : 1;
            $employee->employee_number = 'EMP-'.str_pad($next, 4, '0', STR_PAD_LEFT);
        });
    }
}
