<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PortalController extends Controller
{
    public function select(): Response
    {
        if (Auth::guard('doctor')->check()) {
            $doctor = Auth::guard('doctor')->user();
            $employee = $doctor->employee;

            return Inertia::render('portal-select', [
                'name' => $employee?->full_name ?? $doctor->name,
                'position' => $employee?->position?->name ?? 'Эмч',
                'portal' => 'doctor',
            ]);
        }

        $user = Auth::user();
        $employee = $user->employee;
        $portal = $employee?->position?->portal ?? $user->role?->name ?? 'staff';

        return Inertia::render('portal-select', [
            'name' => $employee?->full_name ?? $user->name,
            'position' => $employee?->position?->name ?? '',
            'portal' => $portal,
        ]);
    }

    public function goWork(): RedirectResponse
    {
        if (Auth::guard('doctor')->check()) {
            return redirect()->route('doctor.dashboard');
        }

        $user = Auth::user();
        $employee = $user->employee;
        $portal = $employee?->position?->portal ?? $user->role?->name ?? 'staff';

        return match ($portal) {
            'admin' => redirect()->route('admin.dashboard'),
            'reception' => redirect()->route('reception.dashboard'),
            'hr' => redirect()->route('hr.employees.index'),
            default => $user->isAdmin()
                            ? redirect()->route('admin.dashboard')
                            : redirect()->route('reception.dashboard'),
        };
    }

    public function goHr(): RedirectResponse
    {
        return redirect()->route('my.home');
    }

    public function verifyAndSwitch(Request $request): RedirectResponse
    {
        $request->validate(['password' => 'required|string']);

        if (Auth::guard('doctor')->check()) {
            if (! Hash::check($request->password, Auth::guard('doctor')->user()->password)) {
                return back()->withErrors(['password' => 'Нууц үг буруу байна.']);
            }
        } elseif (Auth::guard('web')->check()) {
            if (! Hash::check($request->password, Auth::user()->password)) {
                return back()->withErrors(['password' => 'Нууц үг буруу байна.']);
            }
        } else {
            return redirect()->route('login');
        }

        return $request->input('destination') === 'hr'
            ? redirect()->route('portal.hr')
            : redirect()->route('portal.work');
    }
}
