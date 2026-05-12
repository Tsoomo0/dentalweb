<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\HR\Employee;
use App\Models\HR\EmployeeContract;
use App\Models\HR\EmployeeFamilyMember;
use App\Models\HR\EmployeeLicense;
use App\Models\HR\PayrollEntry;
use App\Models\HR\Position;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(): Response
    {
        $employees = Employee::with(['branch', 'position'])
            ->orderBy('last_name')
            ->get()
            ->map(fn(Employee $e) => [
                'id'              => $e->id,
                'employee_number' => $e->employee_number,
                'full_name'       => $e->full_name,
                'photo_url'       => $e->photo_url,
                'position'        => $e->position?->name,
                'branch'          => $e->branch?->name,
                'branch_id'       => $e->branch_id,
                'phone'           => $e->phone,
                'gender'          => $e->gender,
                'children_count'  => $e->children_count ?? 0,
                'status'          => $e->status,
                'hired_date'      => $e->hired_date?->format('Y.m.d'),
            ]);

        return Inertia::render('hr/employees/index', [
            'employees' => $employees,
            'branches'  => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function exportExcel(): \Illuminate\Http\Response
    {
        $employees = Employee::with(['branch', 'position'])
            ->orderBy('last_name')->get();

        $html    = view('hr.employees-excel', compact('employees'))->render();
        $encoded = rawurlencode('Ажилтнууд.xls');

        return response("\xEF\xBB\xBF" . $html, 200, [
            'Content-Type'        => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename*=UTF-8''{$encoded}",
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('hr/employees/create', [
            'branches'  => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'positions' => Position::where('is_active', true)->orderBy('name')->get(['id', 'name', 'portal', 'department']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'last_name'       => 'required|string|max:100',
            'first_name'      => 'required|string|max:100',
            'register_number' => 'required|string|max:20|unique:employees',
            'birth_date'      => 'required|date',
            'gender'          => 'required|in:male,female',
            'phone'           => 'required|string|max:20',
            'branch_id'       => 'required|exists:branches,id',
            'position_id'     => 'required|exists:positions,id',
            'hired_date'      => 'required|date',
            'salary'          => 'required|numeric|min:0',
            // Нэвтрэх
            'username'        => 'required|string|unique:users,name',
            'password'        => 'required|string|min:6',
        ]);

        DB::transaction(function () use ($request) {
            // 1. User үүсгэх
            $position       = Position::findOrFail($request->position_id);
            $role           = $this->portalToRole($position->portal);
            $hashedPassword = Hash::make($request->password);
            $loginEmail     = $request->email ?? $request->username . '@dental.mn';

            $user = User::create([
                'name'     => $request->username,
                'email'    => $loginEmail,
                'password' => $hashedPassword,
                'role_id'  => $role,
                'phone'    => $request->phone,
                'is_active'=> true,
            ]);

            // 2. Зураг хадгалах
            $photo = null;
            if ($request->hasFile('photo')) {
                $photo = $request->file('photo')->store('employees/photos', 'public');
            }

            // 3. Employee үүсгэх
            $employee = Employee::create([
                'user_id'         => $user->id,
                'photo'           => $photo,
                'last_name'       => $request->last_name,
                'first_name'      => $request->first_name,
                'register_number' => $request->register_number,
                'birth_date'      => $request->birth_date,
                'gender'          => $request->gender,
                'family_name'     => $request->family_name,
                'ethnicity'       => $request->ethnicity,
                'birth_place'     => $request->birth_place,
                'blood_type'      => $request->blood_type,
                'driver_license'  => $request->driver_license,
                'military_service'=> $request->boolean('military_service'),
                'education_degree'=> $request->education_degree,
                'education_school'=> $request->education_school,
                'education_major' => $request->education_major,
                'phone'           => $request->phone,
                'email'           => $request->email,
                'address'         => $request->address,
                'emergency_name'  => $request->emergency_name,
                'emergency_phone' => $request->emergency_phone,
                'emergency_relation' => $request->emergency_relation,
                'branch_id'       => $request->branch_id,
                'position_id'     => $request->position_id,
                'salary'          => $request->salary,
                'hired_date'      => $request->hired_date,
                'probation_end_date' => $request->probation_end_date,
                'status'              => 'active',
                'vacation_extra_days' => $request->vacation_extra_days ?? 0,
                'bank_name'           => $request->bank_name,
                'bank_account'        => $request->bank_account,
                'bank_account_name'   => $request->bank_account_name,
                'is_married'          => $request->boolean('is_married'),
                'has_children'        => $request->boolean('has_children'),
                'children_count'      => $request->children_count ?? 0,
                'notes'               => $request->notes,
            ]);

            // 4. Гэрээ хадгалах
            if ($request->filled('contract_start_date')) {
                $contractFile = null;
                if ($request->hasFile('contract_file')) {
                    $contractFile = $request->file('contract_file')
                        ->store('employees/contracts', 'public');
                }
                EmployeeContract::create([
                    'employee_id'   => $employee->id,
                    'contract_type' => $request->contract_type ?? 'fixed',
                    'file_path'     => $contractFile,
                    'start_date'    => $request->contract_start_date,
                    'end_date'      => $request->contract_end_date,
                    'notes'         => $request->contract_notes,
                ]);
            }

            // 5. Лиценз хадгалах
            if ($request->filled('licenses')) {
                foreach ($request->licenses as $lic) {
                    if (empty($lic['name'])) continue;
                    $licFile = null;
                    if (!empty($lic['file'])) {
                        $licFile = $lic['file']->store('employees/licenses', 'public');
                    }
                    EmployeeLicense::create([
                        'employee_id' => $employee->id,
                        'name'        => $lic['name'],
                        'issuer'      => $lic['issuer'] ?? null,
                        'file_path'   => $licFile,
                        'start_date'  => $lic['start_date'] ?? null,
                        'end_date'    => $lic['end_date'] ?? null,
                        'notes'       => $lic['notes'] ?? null,
                    ]);
                }
            }

            // 6. Гэр бүлийн гишүүд хадгалах
            if ($request->filled('family_members')) {
                foreach ($request->family_members as $fm) {
                    if (empty($fm['first_name'])) continue;
                    EmployeeFamilyMember::create([
                        'employee_id'      => $employee->id,
                        'last_name'        => $fm['last_name'] ?? '',
                        'first_name'       => $fm['first_name'],
                        'phone'            => $fm['phone'] ?? null,
                        'relationship'     => $fm['relationship'] ?? '',
                        'birth_date'       => $fm['birth_date'] ?? null,
                        'employment_status'=> $fm['employment_status'] ?? null,
                    ]);
                }
            }

            // 7. Эмчийн тушаалтай бол Doctor record автоматаар үүсгэх
            if ($position->portal === 'doctor') {
                $doctor = Doctor::create([
                    'employee_id' => $employee->id,
                    'branch_id'   => $employee->branch_id,
                    'name'        => $employee->full_name,
                    'phone'       => $employee->phone,
                    'email'       => $loginEmail,   // нэвтрэх имэйл (user-тай адил)
                    'photo'       => $employee->photo,
                    'is_active'   => true,
                    'password'    => $hashedPassword, // нэвтрэх нууц үг (user-тай адил)
                ]);
                if ($employee->branch_id) {
                    $doctor->branches()->sync([$employee->branch_id]);
                }
            }
        });

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
            ->map(fn($e) => [
                'run_id'       => $e->payroll_run_id,
                'run_title'    => $e->run->title,
                'status'       => $e->run->status,
                'basic_salary' => $e->basic_salary,
                'calc_salary'  => $e->calc_salary,
                'net_hand'     => $e->net_hand,
                'bank_salary'  => $e->bank_salary,
                'ndsh'         => $e->ndsh,
                'income_tax'   => $e->income_tax,
            ]);

        return Inertia::render('hr/employees/show', [
            'employee'          => $this->formatEmployee($employee),
            'payrollHistory'    => $payrollHistory,
            'exit_checklist_id' => $employee->exitChecklist?->id,
        ]);
    }

    public function edit(Employee $employee): Response
    {
        $employee->load(['contracts', 'licenses', 'familyMembers']);

        return Inertia::render('hr/employees/edit', [
            'employee'  => $this->formatEmployee($employee),
            'branches'  => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'positions' => Position::where('is_active', true)->orderBy('name')->get(['id', 'name', 'portal', 'department']),
        ]);
    }

    public function update(Request $request, Employee $employee): RedirectResponse
    {
        $request->validate([
            'last_name'  => 'required|string|max:100',
            'first_name' => 'required|string|max:100',
            'phone'      => 'required|string|max:20',
            'branch_id'  => 'required|exists:branches,id',
            'position_id'=> 'required|exists:positions,id',
            'salary'     => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($request, $employee) {
            if ($request->hasFile('photo')) {
                if ($employee->photo) Storage::disk('public')->delete($employee->photo);
                $employee->photo = $request->file('photo')->store('employees/photos', 'public');
            }

            $employee->update([
                'last_name'           => $request->last_name,
                'first_name'          => $request->first_name,
                'register_number'     => $request->register_number,
                'birth_date'          => $request->birth_date ?: null,
                'gender'              => $request->gender,
                'family_name'         => $request->family_name ?: null,
                'ethnicity'           => $request->ethnicity ?: null,
                'birth_place'         => $request->birth_place ?: null,
                'blood_type'          => $request->blood_type ?: null,
                'driver_license'      => $request->driver_license ?: null,
                'military_service'    => filter_var($request->military_service, FILTER_VALIDATE_BOOLEAN),
                'education_degree'    => $request->education_degree ?: null,
                'education_school'    => $request->education_school ?: null,
                'education_major'     => $request->education_major ?: null,
                'phone'               => $request->phone,
                'email'               => $request->email ?: null,
                'address'             => $request->address ?: null,
                'emergency_name'      => $request->emergency_name ?: null,
                'emergency_phone'     => $request->emergency_phone ?: null,
                'emergency_relation'  => $request->emergency_relation ?: null,
                'branch_id'           => $request->branch_id,
                'position_id'         => $request->position_id,
                'salary'              => $request->salary,
                'hired_date'          => $request->hired_date ?: null,
                'probation_end_date'  => $request->probation_end_date ?: null,
                'status'              => $request->status,
                'vacation_extra_days' => (int) $request->vacation_extra_days,
                'bank_name'           => $request->bank_name ?: null,
                'bank_account'        => $request->bank_account ?: null,
                'bank_account_name'   => $request->bank_account_name ?: null,
                'is_married'          => filter_var($request->is_married, FILTER_VALIDATE_BOOLEAN),
                'has_children'        => filter_var($request->has_children, FILTER_VALIDATE_BOOLEAN),
                'children_count'      => (int) $request->children_count,
                'notes'               => $request->notes ?: null,
            ]);

            // Шинэ лицензүүд нэмэх
            if ($request->filled('licenses')) {
                foreach ($request->licenses as $lic) {
                    if (empty($lic['name'])) continue;
                    EmployeeLicense::create([
                        'employee_id' => $employee->id,
                        'name'        => $lic['name'],
                        'issuer'      => $lic['issuer'] ?? null,
                        'start_date'  => $lic['start_date'] ?: null,
                        'end_date'    => $lic['end_date'] ?: null,
                        'notes'       => $lic['notes'] ?? null,
                    ]);
                }
            }

            // Шинэ гэр бүлийн гишүүд нэмэх
            if ($request->filled('family_members')) {
                foreach ($request->family_members as $fm) {
                    if (empty($fm['first_name'])) continue;
                    EmployeeFamilyMember::create([
                        'employee_id'       => $employee->id,
                        'last_name'         => $fm['last_name'] ?? '',
                        'first_name'        => $fm['first_name'],
                        'phone'             => $fm['phone'] ?? null,
                        'relationship'      => $fm['relationship'] ?? '',
                        'birth_date'        => $fm['birth_date'] ?: null,
                        'employment_status' => $fm['employment_status'] ?? null,
                    ]);
                }
            }

            // Холбоотой Doctor record шинэчлэх
            $employee->refresh();
            if ($employee->doctor) {
                $syncData = [
                    'branch_id' => $employee->branch_id,
                    'name'      => $employee->full_name,
                    'phone'     => $employee->phone,
                    'email'     => $employee->email,
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

        return redirect()->route('hr.employees.show', $employee)
            ->with('success', 'Мэдээлэл амжилттай шинэчлэгдлээ.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        // Эмчтэй холбоотой тохиолдолд эмчийн бүртгэлийг устгах
        $employee->doctor?->delete();

        // Нэвтрэх эрхийг идэвхгүй болгох
        $employee->user?->update(['is_active' => false]);

        $employee->delete();

        return redirect()->route('hr.employees.index')->with('success', 'Ажилтан амжилттай устгагдлаа.');
    }

    public function toggleStatus(Employee $employee): RedirectResponse
    {
        $employee->update(['status' => $employee->status === 'active' ? 'inactive' : 'active']);
        return back();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function portalToRole(string $portal): int
    {
        // roles хүснэгтээс role_id авна
        return \App\Models\Role::where('name', $portal)->value('id')
            ?? \App\Models\Role::where('name', 'staff')->value('id')
            ?? 1;
    }

    private function formatEmployee(Employee $e): array
    {
        return [
            'id'              => $e->id,
            'employee_number' => $e->employee_number,
            'photo_url'       => $e->photo_url,
            'last_name'       => $e->last_name,
            'first_name'      => $e->first_name,
            'full_name'       => $e->full_name,
            'register_number' => $e->register_number,
            'birth_date'      => $e->birth_date?->format('Y-m-d'),
            'gender'          => $e->gender,
            'family_name'     => $e->family_name,
            'ethnicity'       => $e->ethnicity,
            'birth_place'     => $e->birth_place,
            'blood_type'      => $e->blood_type,
            'driver_license'  => $e->driver_license,
            'military_service'=> $e->military_service,
            'education_degree'=> $e->education_degree,
            'education_school'=> $e->education_school,
            'education_major' => $e->education_major,
            'phone'           => $e->phone,
            'email'           => $e->email,
            'address'         => $e->address,
            'emergency_name'  => $e->emergency_name,
            'emergency_phone' => $e->emergency_phone,
            'emergency_relation' => $e->emergency_relation,
            'branch_id'       => $e->branch_id,
            'branch'          => $e->branch?->name,
            'position_id'     => $e->position_id,
            'position'        => $e->position?->name,
            'salary'          => $e->salary,
            'hired_date'      => $e->hired_date?->format('Y-m-d'),
            'probation_end_date' => $e->probation_end_date?->format('Y-m-d'),
            'status'          => $e->status,
            'bank_name'       => $e->bank_name,
            'bank_account'    => $e->bank_account,
            'bank_account_name' => $e->bank_account_name,
            'is_married'      => $e->is_married,
            'has_children'    => $e->has_children,
            'children_count'  => $e->children_count,
            'notes'               => $e->notes,
            'vacation_days'       => $e->vacation_days,
            'vacation_extra_days' => $e->vacation_extra_days,
            'contracts'           => $e->contracts->map(fn($c) => [
                'id'            => $c->id,
                'contract_type' => $c->contract_type,
                'start_date'    => $c->start_date?->format('Y-m-d'),
                'end_date'      => $c->end_date?->format('Y-m-d'),
                'notes'         => $c->notes,
                'days_until_expiry' => $c->days_until_expiry,
            ]),
            'licenses'        => $e->licenses->map(fn($l) => [
                'id'         => $l->id,
                'name'       => $l->name,
                'issuer'     => $l->issuer,
                'start_date' => $l->start_date?->format('Y-m-d'),
                'end_date'   => $l->end_date?->format('Y-m-d'),
                'notes'      => $l->notes,
                'days_until_expiry' => $l->days_until_expiry,
            ]),
            'family_members'  => $e->familyMembers->map(fn($f) => [
                'id'               => $f->id,
                'last_name'        => $f->last_name,
                'first_name'       => $f->first_name,
                'phone'            => $f->phone,
                'relationship'     => $f->relationship,
                'birth_date'       => $f->birth_date?->format('Y-m-d'),
                'employment_status'=> $f->employment_status,
            ]),
        ];
    }
}
