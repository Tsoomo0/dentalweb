<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /** Зөвхөн admin / receptionist роллуудыг буцаана */
    private function staffRoles(): \Illuminate\Database\Eloquent\Collection
    {
        return Role::whereIn('name', ['admin', 'receptionist'])->get(['id', 'name']);
    }

    public function index(): Response
    {
        $users = User::with(['role', 'branch'])
            ->whereHas('role', fn($q) => $q->whereIn('name', ['admin', 'receptionist']))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($u) => [
                'id'          => $u->id,
                'name'        => $u->name,
                'email'       => $u->email,
                'role'        => $u->role?->name,
                'branch_id'   => $u->branch_id,
                'branch_name' => $u->branch?->name,
                'is_active'   => $u->is_active,
                'created_at'  => $u->created_at?->format('Y.m.d'),
            ]);

        return Inertia::render('admin/users/index', [
            'users'    => $users,
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'stats'    => [
                'total'        => $users->count(),
                'admin'        => $users->where('role', 'admin')->count(),
                'receptionist' => $users->where('role', 'receptionist')->count(),
                'active'       => $users->where('is_active', true)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/users/create', [
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'roles'    => $this->staffRoles(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $staffRoleIds = $this->staffRoles()->pluck('id')->toArray();

        $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|max:255|unique:users,email',
            'password'  => 'required|string|min:8|confirmed',
            'role_id'   => ['required', Rule::in($staffRoleIds)],
            'branch_id' => 'nullable|exists:branches,id',
            'is_active' => 'boolean',
        ]);

        User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'role_id'   => $request->role_id,
            'branch_id' => $request->branch_id,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', 'Хэрэглэгч амжилттай нэмэгдлээ.');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('admin/users/edit', [
            'user' => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'role_id'   => $user->role_id,
                'role_name' => $user->role?->name,
                'branch_id' => $user->branch_id,
                'is_active' => $user->is_active,
            ],
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'roles'    => $this->staffRoles(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $staffRoleIds = $this->staffRoles()->pluck('id')->toArray();

        $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password'  => 'nullable|string|min:8|confirmed',
            'role_id'   => ['required', Rule::in($staffRoleIds)],
            'branch_id' => 'nullable|exists:branches,id',
            'is_active' => 'boolean',
        ]);

        $data = [
            'name'      => $request->name,
            'email'     => $request->email,
            'role_id'   => $request->role_id,
            'branch_id' => $request->branch_id,
            'is_active' => $request->boolean('is_active', true),
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return redirect()->route('admin.users.index')
            ->with('success', 'Мэдээлэл амжилттай шинэчлэгдлээ.');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'Өөрийгөө устгах боломжгүй.');
        }
        $user->delete();
        return back()->with('success', 'Хэрэглэгч устгагдлаа.');
    }

    public function toggle(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'Өөрийн эрхийг өөрчлөх боломжгүй.');
        }
        $user->update(['is_active' => !$user->is_active]);
        return back()->with('success', $user->is_active ? 'Идэвхжүүллээ.' : 'Идэвхгүй болголоо.');
    }
}
