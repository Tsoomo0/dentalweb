<?php

namespace App\Http\Controllers\HR;

use App\Exports\EmployeeExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeContract;
use App\Models\HR\EmployeeFamilyMember;
use App\Models\HR\EmployeeLicense;
use App\Models\HR\PayrollEntry;
use App\Models\HR\Position;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Employee::with(['branch', 'position'])->orderBy('last_name');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%$search%")
                    ->orWhere('last_name', 'like', "%$search%")
                    ->orWhere('employee_number', 'like', "%$search%")
                    ->orWhereHas('position', fn ($q) => $q->where('name', 'like', "%$search%"));
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($branchId = $request->input('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        $employees = $query->paginate(20)->withQueryString()
            ->through(fn (Employee $e) => [
                'id' => $e->id,
                'employee_number' => $e->employee_number,
                'full_name' => $e->full_name,
                'photo_url' => $e->photo_url,
                'position' => $e->position?->name,
                'branch' => $e->branch?->name,
                'branch_id' => $e->branch_id,
                'phone' => $e->phone,
                'gender' => $e->gender,
                'children_count' => $e->children_count ?? 0,
                'status' => $e->status,
                'hired_date' => $e->hired_date?->format('Y.m.d'),
            ]);

        return Inertia::render('hr/employees/index', [
            'employees' => $employees,
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'status', 'branch_id']),
        ]);
    }

    public function exportExcel(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $employees = Employee::with(['branch', 'position'])
            ->orderBy('last_name')->get();

        return Excel::download(new EmployeeExport($employees), 'Ажилтнууд.xlsx');
    }

    public function create(): Response
    {
        return Inertia::render('hr/employees/create', [
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'positions' => Position::where('is_active', true)->orderBy('name')->get(['id', 'name', 'portal', 'department']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // multipart form-аас "extra_portals" нь null/empty string болж ирж магадгүй
        // тул array болгож normalize хийнэ
        if ($request->has('extra_portals') && ! is_array($request->extra_portals)) {
            $val = $request->input('extra_portals');
            $request->merge(['extra_portals' => $val ? (array) $val : []]);
        }

        $request->validate([
            'last_name'       => 'required|string|max:100',
            'first_name'      => 'required|string|max:100',
            'register_number' => 'required|string|max:20|unique:employees,register_number',
            'birth_date'      => 'required|date',
            'gender'          => 'required|in:male,female',
            'phone'           => 'required|string|max:20',
            'branch_id'       => 'required|exists:branches,id',
            'position_id'     => 'required|exists:positions,id',
            'hired_date'      => 'required|date',
            'salary'          => 'required|numeric|min:0',
            'username'        => 'required|string|unique:users,name',
            'password'        => 'required|string|min:6',
            'email'           => 'nullable|email|max:191|unique:users,email',
            'extra_portals'   => 'nullable|array',
            'extra_portals.*' => 'in:reception,lab,hr',
        ], [
            'last_name.required'       => 'Овог заавал бөглөнө үү.',
            'first_name.required'      => 'Нэр заавал бөглөнө үү.',
            'register_number.required' => 'Регистрийн дугаар заавал бөглөнө үү.',
            'register_number.unique'   => 'Энэ регистрийн дугаар аль хэдийн бүртгэгдсэн байна.',
            'birth_date.required'      => 'Төрсөн огноо заавал бөглөнө үү.',
            'gender.required'          => 'Хүйс заавал сонгоно уу.',
            'phone.required'           => 'Утасны дугаар заавал бөглөнө үү.',
            'branch_id.required'       => 'Салбар заавал сонгоно уу.',
            'position_id.required'     => 'Албан тушаал заавал сонгоно уу.',
            'hired_date.required'      => 'Ажилд орсон огноо заавал бөглөнө үү.',
            'salary.required'          => 'Цалин заавал бөглөнө үү.',
            'username.required'        => 'Нэвтрэх нэр заавал бөглөнө үү.',
            'username.unique'          => 'Энэ нэвтрэх нэр аль хэдийн бүртгэгдсэн байна.',
            'password.required'        => 'Нууц үг заавал бөглөнө үү.',
            'password.min'             => 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.',
            'email.unique'             => 'Энэ имэйл хаяг аль хэдийн бүртгэгдсэн байна.',
            'email.email'              => 'Зөв имэйл хаяг оруулна уу.',
        ]);

        // Email оруулаагүй бол auto-generated email-ийн uniqueness шалгах
        if (! $request->filled('email')) {
            $autoEmail = $request->username.'@dental.mn';
            if (User::where('email', $autoEmail)->exists()) {
                return back()->withErrors(['email' => "Системийн автомат имэйл ({$autoEmail}) аль хэдийн бүртгэгдсэн байна. Имэйл талбарт өөр хаяг оруулна уу."])->withInput();
            }
        }

        $createdEmployee = DB::transaction(function () use ($request) {
            // 1. User үүсгэх
            $position = Position::findOrFail($request->position_id);
            $role = $this->portalToRole($position->portal);
            $hashedPassword = Hash::make($request->password);
            $loginEmail = $request->email ?? $request->username.'@dental.mn';

            $user = User::create([
                'name' => $request->username,
                'email' => $loginEmail,
                'password' => $hashedPassword,
                'role_id' => $role,
                'phone' => $request->phone,
                'branch_id' => $request->branch_id,
                'is_active' => true,
            ]);

            // 2. Зураг хадгалах
            $photo = null;
            if ($request->hasFile('photo')) {
                $photo = $request->file('photo')->store('employees/photos', 'public');
            }

            // 3. Employee үүсгэх
            $employee = Employee::create([
                'user_id' => $user->id,
                'photo' => $photo,
                'last_name' => $request->last_name,
                'first_name' => $request->first_name,
                'register_number' => $request->register_number,
                'birth_date' => $request->birth_date,
                'gender' => $request->gender,
                'family_name' => $request->family_name,
                'ethnicity' => $request->ethnicity,
                'birth_place' => $request->birth_place,
                'blood_type' => $request->blood_type,
                'driver_license' => $request->driver_license,
                'military_service' => $request->boolean('military_service'),
                'education_degree' => $request->education_degree,
                'education_school' => $request->education_school,
                'education_major' => $request->education_major,
                'phone' => $request->phone,
                'email' => $request->email,
                'address' => $request->address,
                'emergency_name' => $request->emergency_name,
                'emergency_phone' => $request->emergency_phone,
                'emergency_relation' => $request->emergency_relation,
                'branch_id' => $request->branch_id,
                'position_id' => $request->position_id,
                'salary' => $request->salary,
                'hired_date' => $request->hired_date,
                'probation_end_date' => $request->probation_end_date,
                'status' => 'active',
                'vacation_extra_days' => $request->vacation_extra_days ?? 0,
                'bank_name' => $request->bank_name,
                'bank_account' => $request->bank_account,
                'bank_account_name' => $request->bank_account_name,
                'is_married' => $request->boolean('is_married'),
                'has_children' => $request->boolean('has_children'),
                'children_count' => $request->children_count ?? 0,
                'notes' => $request->notes,
                'extra_portals' => $request->extra_portals ?? [],
            ]);

            // 4. Гэрээ хадгалах
            if ($request->filled('contract_start_date')) {
                $contractFile = null;
                if ($request->hasFile('contract_file')) {
                    $contractFile = $request->file('contract_file')
                        ->store('employees/contracts', 'public');
                }
                EmployeeContract::create([
                    'employee_id' => $employee->id,
                    'contract_type' => $request->contract_type ?? 'fixed',
                    'file_path' => $contractFile,
                    'start_date' => $request->contract_start_date,
                    'end_date' => $request->contract_end_date,
                    'notes' => $request->contract_notes,
                ]);
            }

            // 5. Лиценз хадгалах
            if ($request->filled('licenses')) {
                foreach ($request->licenses as $lic) {
                    if (empty($lic['name'])) {
                        continue;
                    }
                    $licFile = null;
                    if (! empty($lic['file'])) {
                        $licFile = $lic['file']->store('employees/licenses', 'public');
                    }
                    EmployeeLicense::create([
                        'employee_id' => $employee->id,
                        'name' => $lic['name'],
                        'issuer' => $lic['issuer'] ?? null,
                        'file_path' => $licFile,
                        'start_date' => $lic['start_date'] ?? null,
                        'end_date' => $lic['end_date'] ?? null,
                        'notes' => $lic['notes'] ?? null,
                    ]);
                }
            }

            // 6. Гэр бүлийн гишүүд хадгалах
            if ($request->filled('family_members')) {
                foreach ($request->family_members as $fm) {
                    if (empty($fm['first_name'])) {
                        continue;
                    }
                    EmployeeFamilyMember::create([
                        'employee_id' => $employee->id,
                        'last_name' => $fm['last_name'] ?? '',
                        'first_name' => $fm['first_name'],
                        'phone' => $fm['phone'] ?? null,
                        'relationship' => $fm['relationship'] ?? '',
                        'birth_date' => $fm['birth_date'] ?? null,
                        'employment_status' => $fm['employment_status'] ?? null,
                    ]);
                }
            }

            // 7. Эмчийн тушаалтай бол Doctor record автоматаар үүсгэх
            if ($position->portal === 'doctor') {
                $doctor = Doctor::create([
                    'employee_id' => $employee->id,
                    'branch_id' => $employee->branch_id,
                    'name' => $employee->full_name,
                    'specialization' => $position->name,
                    'phone' => $employee->phone,
                    'email' => $loginEmail,
                    'photo' => $employee->photo,
                    'is_active' => true,
                    'password' => $hashedPassword,
                ]);
                if ($employee->branch_id) {
                    $doctor->branches()->sync([$employee->branch_id]);
                }
            }

            return $employee;
        });

        if ($createdEmployee) {
            AuditService::log('created', $createdEmployee, null,
                ['name' => $createdEmployee->full_name, 'number' => $createdEmployee->employee_number],
                "Шинэ ажилтан бүртгэв: {$createdEmployee->full_name} ({$createdEmployee->employee_number})");
        }

        return redirect()->route('hr.employees.index')
            ->with('success', 'Ажилтан амжилттай бүртгэгдлээ.');
    }

    public function show(Employee $employee): Response
    {
        $employee->load(['branch', 'position', 'contracts', 'licenses', 'familyMembers', 'user', 'exitChecklist']);

        $payrollHistory = PayrollEntry::with('run')
            ->where('employee_id', $employee->id)
            ->whereHas('run')
            ->orderByDesc('payroll_run_id')
            ->get()
            ->map(fn ($e) => [
                'run_id' => $e->payroll_run_id,
                'run_title' => $e->run->title,
                'status' => $e->run->status,
                'basic_salary' => $e->basic_salary,
                'calc_salary' => $e->calc_salary,
                'net_hand' => $e->net_hand,
                'bank_salary' => $e->bank_salary,
                'ndsh' => $e->ndsh,
                'income_tax' => $e->income_tax,
            ]);

        return Inertia::render('hr/employees/show', [
            'employee' => $this->formatEmployee($employee),
            'payrollHistory' => $payrollHistory,
            'exit_checklist_id' => $employee->exitChecklist?->id,
        ]);
    }

    public function edit(Employee $employee): Response
    {
        $employee->load(['contracts', 'licenses', 'familyMembers']);

        return Inertia::render('hr/employees/edit', [
            'employee' => $this->formatEmployee($employee),
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'positions' => Position::where('is_active', true)->orderBy('name')->get(['id', 'name', 'portal', 'department']),
        ]);
    }

    public function update(Request $request, Employee $employee): RedirectResponse
    {
        // multipart form-аас "extra_portals" нь null/empty string болж ирж магадгүй
        if ($request->has('extra_portals') && ! is_array($request->extra_portals)) {
            $val = $request->input('extra_portals');
            $request->merge(['extra_portals' => $val ? (array) $val : []]);
        }

        $request->validate([
            'last_name' => 'required|string|max:100',
            'first_name' => 'required|string|max:100',
            'phone' => 'required|string|max:20',
            'branch_id' => 'required|exists:branches,id',
            'position_id' => 'required|exists:positions,id',
            'salary' => 'required|numeric|min:0',
            'extra_portals' => 'nullable|array',
            'extra_portals.*' => 'in:reception,lab,hr',
        ]);

        DB::transaction(function () use ($request, $employee) {
            if ($request->hasFile('photo')) {
                if ($employee->photo) {
                    Storage::disk('public')->delete($employee->photo);
                }
                $employee->photo = $request->file('photo')->store('employees/photos', 'public');
            }

            $employee->update([
                'last_name' => $request->last_name,
                'first_name' => $request->first_name,
                'register_number' => $request->register_number,
                'birth_date' => $request->birth_date ?: null,
                'gender' => $request->gender,
                'family_name' => $request->family_name ?: null,
                'ethnicity' => $request->ethnicity ?: null,
                'birth_place' => $request->birth_place ?: null,
                'blood_type' => $request->blood_type ?: null,
                'driver_license' => $request->driver_license ?: null,
                'military_service' => filter_var($request->military_service, FILTER_VALIDATE_BOOLEAN),
                'education_degree' => $request->education_degree ?: null,
                'education_school' => $request->education_school ?: null,
                'education_major' => $request->education_major ?: null,
                'phone' => $request->phone,
                'email' => $request->email ?: null,
                'address' => $request->address ?: null,
                'emergency_name' => $request->emergency_name ?: null,
                'emergency_phone' => $request->emergency_phone ?: null,
                'emergency_relation' => $request->emergency_relation ?: null,
                'branch_id' => $request->branch_id,
                'position_id' => $request->position_id,
                'salary' => $request->salary,
                'hired_date' => $request->hired_date ?: null,
                'probation_end_date' => $request->probation_end_date ?: null,
                'status' => $request->status,
                'vacation_extra_days' => (int) $request->vacation_extra_days,
                'bank_name' => $request->bank_name ?: null,
                'bank_account' => $request->bank_account ?: null,
                'bank_account_name' => $request->bank_account_name ?: null,
                'is_married' => filter_var($request->is_married, FILTER_VALIDATE_BOOLEAN),
                'has_children' => filter_var($request->has_children, FILTER_VALIDATE_BOOLEAN),
                'children_count' => (int) $request->children_count,
                'notes' => $request->notes ?: null,
                'extra_portals' => $request->input('extra_portals', []),
            ]);

            // Шинэ лицензүүд нэмэх
            if ($request->filled('licenses')) {
                foreach ($request->licenses as $lic) {
                    if (empty($lic['name'])) {
                        continue;
                    }
                    EmployeeLicense::create([
                        'employee_id' => $employee->id,
                        'name' => $lic['name'],
                        'issuer' => $lic['issuer'] ?? null,
                        'start_date' => $lic['start_date'] ?: null,
                        'end_date' => $lic['end_date'] ?: null,
                        'notes' => $lic['notes'] ?? null,
                    ]);
                }
            }

            // Шинэ гэр бүлийн гишүүд нэмэх
            if ($request->filled('family_members')) {
                foreach ($request->family_members as $fm) {
                    if (empty($fm['first_name'])) {
                        continue;
                    }
                    EmployeeFamilyMember::create([
                        'employee_id' => $employee->id,
                        'last_name' => $fm['last_name'] ?? '',
                        'first_name' => $fm['first_name'],
                        'phone' => $fm['phone'] ?? null,
                        'relationship' => $fm['relationship'] ?? '',
                        'birth_date' => $fm['birth_date'] ?: null,
                        'employment_status' => $fm['employment_status'] ?? null,
                    ]);
                }
            }

            // Холбоотой User-ийн branch_id шинэчлэх
            $employee->user?->update(['branch_id' => $request->branch_id]);

            // Холбоотой Doctor record шинэчлэх
            $employee->refresh();
            if ($employee->doctor) {
                $syncData = [
                    'branch_id' => $employee->branch_id,
                    'name' => $employee->full_name,
                    'specialization' => $employee->position?->name ?? $employee->doctor->specialization,
                    'phone' => $employee->phone,
                    'email' => $employee->email,
                ];
                if ($request->hasFile('photo')) {
                    $syncData['photo'] = $employee->photo;
                }
                $employee->doctor->update($syncData);
                if ($employee->branch_id) {
                    $employee->doctor->branches()->sync([$employee->branch_id]);
                }
            }
        });

        AuditService::log('updated', $employee, null,
            ['name' => $employee->full_name, 'number' => $employee->employee_number],
            "Ажилтны мэдээлэл шинэчлэв: {$employee->full_name}");

        return redirect()->route('hr.employees.index')
            ->with('success', 'Мэдээлэл амжилттай шинэчлэгдлээ.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $name = $employee->full_name;
        $number = $employee->employee_number;

        $employee->doctor?->delete();
        $employee->user?->update(['is_active' => false]);
        $employee->delete();

        AuditService::log('deleted', $employee, ['name' => $name, 'number' => $number], null,
            "Ажилтан устгав: {$name} ({$number})");

        return redirect()->route('hr.employees.index')->with('success', 'Ажилтан амжилттай устгагдлаа.');
    }

    public function toggleStatus(Employee $employee): RedirectResponse
    {
        $old = $employee->status;
        $employee->update(['status' => $employee->status === 'active' ? 'inactive' : 'active']);

        AuditService::log('status_changed', $employee, ['status' => $old], ['status' => $employee->status],
            "Ажилтны статус өөрчлөв: {$employee->full_name} → ".($employee->status === 'active' ? 'идэвхтэй' : 'идэвхгүй'));

        return back();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function portalToRole(?string $portal): int
    {
        // Portal нэрийг roles хүснэгтийн нэртэй буулгана.
        //   admin     → admin
        //   reception → receptionist
        //   бусад     → employee (зөвхөн /my хэсэгрүү нэвтэрнэ)
        $roleName = match ($portal) {
            'admin'     => 'admin',
            'reception' => 'receptionist',
            default     => 'employee',
        };

        // Олдохгүй бол employee-руу буулгана (admin БИШ — security)
        return Role::where('name', $roleName)->value('id')
            ?? Role::firstOrCreate(['name' => 'employee'])->id;
    }

    private function formatEmployee(Employee $e): array
    {
        return [
            'id' => $e->id,
            'employee_number' => $e->employee_number,
            'photo_url' => $e->photo_url,
            'last_name' => $e->last_name,
            'first_name' => $e->first_name,
            'full_name' => $e->full_name,
            'register_number' => $e->register_number,
            'birth_date' => $e->birth_date?->format('Y-m-d'),
            'gender' => $e->gender,
            'family_name' => $e->family_name,
            'ethnicity' => $e->ethnicity,
            'birth_place' => $e->birth_place,
            'blood_type' => $e->blood_type,
            'driver_license' => $e->driver_license,
            'military_service' => $e->military_service,
            'education_degree' => $e->education_degree,
            'education_school' => $e->education_school,
            'education_major' => $e->education_major,
            'phone' => $e->phone,
            'email' => $e->email,
            'address' => $e->address,
            'emergency_name' => $e->emergency_name,
            'emergency_phone' => $e->emergency_phone,
            'emergency_relation' => $e->emergency_relation,
            'branch_id' => $e->branch_id,
            'branch' => $e->branch?->name,
            'position_id' => $e->position_id,
            'position' => $e->position?->name,
            'extra_portals' => $e->extra_portals ?? [],
            'salary' => $e->salary,
            'hired_date' => $e->hired_date?->format('Y-m-d'),
            'probation_end_date' => $e->probation_end_date?->format('Y-m-d'),
            'status' => $e->status,
            'bank_name' => $e->bank_name,
            'bank_account' => $e->bank_account,
            'bank_account_name' => $e->bank_account_name,
            'is_married' => $e->is_married,
            'has_children' => $e->has_children,
            'children_count' => $e->children_count,
            'notes' => $e->notes,
            'vacation_days' => $e->vacation_days,
            'vacation_extra_days' => $e->vacation_extra_days,
            'contracts' => $e->contracts->map(fn ($c) => [
                'id' => $c->id,
                'contract_type' => $c->contract_type,
                'start_date' => $c->start_date?->format('Y-m-d'),
                'end_date' => $c->end_date?->format('Y-m-d'),
                'notes' => $c->notes,
                'days_until_expiry' => $c->days_until_expiry,
            ]),
            'licenses' => $e->licenses->map(fn ($l) => [
                'id' => $l->id,
                'name' => $l->name,
                'issuer' => $l->issuer,
                'start_date' => $l->start_date?->format('Y-m-d'),
                'end_date' => $l->end_date?->format('Y-m-d'),
                'notes' => $l->notes,
                'days_until_expiry' => $l->days_until_expiry,
            ]),
            'family_members' => $e->familyMembers->map(fn ($f) => [
                'id' => $f->id,
                'last_name' => $f->last_name,
                'first_name' => $f->first_name,
                'phone' => $f->phone,
                'relationship' => $f->relationship,
                'birth_date' => $f->birth_date?->format('Y-m-d'),
                'employment_status' => $f->employment_status,
            ]),
        ];
    }
}
