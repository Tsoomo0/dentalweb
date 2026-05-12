<?php

namespace App\Models\HR;

use App\Models\Branch;
use App\Models\Doctor;
use App\Models\User;
use App\Models\HR\LeaveRequest;
use App\Models\HR\VacationRequest;
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
    ];

    protected $casts = [
        'birth_date'         => 'date',
        'hired_date'         => 'date',
        'probation_end_date' => 'date',
        'military_service'   => 'boolean',
        'is_married'         => 'boolean',
        'has_children'       => 'boolean',
        'salary'             => 'decimal:2',
    ];

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

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return $this->last_name . ' ' . $this->first_name;
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo ? asset('storage/' . $this->photo) : null;
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
            $employee->employee_number = 'EMP-' . str_pad($next, 4, '0', STR_PAD_LEFT);
        });
    }
}
