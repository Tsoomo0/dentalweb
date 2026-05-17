<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    private function adminRole(): Collection
    {
        return Role::where('name', 'admin')->get(['id', 'name']);
    }

    public function index(): Response
    {
        $users = User::with(['role', 'branch', 'employee.position', 'patient'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role?->name,
                'branch_id' => $u->branch_id,
                'branch_name' => $u->branch?->name,
                'is_active' => $u->is_active,
                'created_at' => $u->created_at?->format('Y.m.d'),
                'is_employee' => $u->employee !== null,
                'position_name' => $u->employee?->position?->name,
                'full_name' => $u->employee
                    ? trim(($u->employee->last_name ?? '').' '.($u->employee->first_name ?? ''))
                    : null,
                'is_patient' => $u->role?->name === 'patient',
                'patient_number' => $u->patient?->patient_number,
            ]);

        $patientCount = $users->where('is_patient', true)->count();
        $staffCount = $users->where('is_patient', false)->count();

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'stats' => [
                'total' => $users->count(),
                'staff' => $staffCount,
                'patient' => $patientCount,
                'active' => $users->where('is_active', true)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/users/create', [
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'roles' => $this->adminRole(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $adminRoleIds = $this->adminRole()->pluck('id')->toArray();

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => ['required', Rule::in($adminRoleIds)],
            'branch_id' => 'nullable|exists:branches,id',
            'is_active' => 'boolean',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $request->role_id,
            'branch_id' => $request->branch_id,
            'is_active' => $request->boolean('is_active', true),
        ]);

        AuditService::log('created', $user, null, ['name' => $user->name, 'email' => $user->email], "Хэрэглэгч үүсгэв: {$user->name}");

        return redirect()->route('admin.users.index')
            ->with('success', 'Хэрэглэгч амжилттай нэмэгдлээ.');
    }

    public function edit(User $user): Response
    {
        $isEmployee = $user->employee !== null;

        return Inertia::render('admin/users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role_id' => $user->role_id,
                'role_name' => $user->role?->name,
                'branch_id' => $user->branch_id,
                'is_active' => $user->is_active,
                'is_employee' => $isEmployee,
                'full_name' => $isEmployee
                    ? trim(($user->employee->last_name ?? '').' '.($user->employee->first_name ?? ''))
                    : null,
                'position_name' => $user->employee?->position?->name,
            ],
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'roles' => $this->adminRole(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $isEmployee = $user->employee !== null;

        if ($isEmployee) {
            // Ажилтны хувьд нэвтрэх нэр, нууц үг, салбар засах боломжтой
            $request->validate([
                'name' => ['required', 'string', 'max:255', Rule::unique('users', 'name')->ignore($user->id)],
                'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
                'password' => 'nullable|string|min:6|confirmed',
                'branch_id' => 'nullable|exists:branches,id',
            ]);

            $data = ['name' => $request->name, 'email' => $request->email, 'branch_id' => $request->branch_id];
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }
        } else {
            $adminRoleIds = $this->adminRole()->pluck('id')->toArray();

            $request->validate([
                'name' => 'required|string|max:255',
                'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
                'password' => 'nullable|string|min:8|confirmed',
                'role_id' => ['required', Rule::in($adminRoleIds)],
                'branch_id' => 'nullable|exists:branches,id',
                'is_active' => 'boolean',
            ]);

            $data = [
                'name' => $request->name,
                'email' => $request->email,
                'role_id' => $request->role_id,
                'branch_id' => $request->branch_id,
                'is_active' => $request->boolean('is_active', true),
            ];
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }
        }

        $user->update($data);

        AuditService::log('updated', $user, null, ['name' => $user->name, 'email' => $user->email], "Хэрэглэгч шинэчлэв: {$user->name}");

        return redirect()->route('admin.users.index')
            ->with('success', 'Мэдээлэл амжилттай шинэчлэгдлээ.');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'Өөрийгөө устгах боломжгүй.');
        }
        AuditService::log('deleted', $user, ['name' => $user->name, 'email' => $user->email], null, "Хэрэглэгч устгав: {$user->name}");
        $user->delete();

        return back()->with('success', 'Хэрэглэгч устгагдлаа.');
    }

    public function toggle(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'Өөрийн эрхийг өөрчлөх боломжгүй.');
        }
        $oldStatus = $user->is_active;
        $user->update(['is_active' => ! $user->is_active]);
        AuditService::log('updated', $user, ['is_active' => $oldStatus], ['is_active' => $user->is_active], ($user->is_active ? 'Идэвхжүүллээ' : 'Идэвхгүй болголоо').": {$user->name}");

        return back()->with('success', $user->is_active ? 'Идэвхжүүллээ.' : 'Идэвхгүй болголоо.');
    }
}
