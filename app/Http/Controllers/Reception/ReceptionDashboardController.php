<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReceptionDashboardController extends Controller
{
    public function dashboard(): Response
    {
        $user   = Auth::user();
        $branch = $user->branch;
        $today  = now()->toDateString();

        $baseQuery = fn() => Appointment::when($branch, fn($q) => $q->where('branch_id', $branch->id));

        return Inertia::render('reception/dashboard', [
            'branch' => $branch ? [
                'id'      => $branch->id,
                'name'    => $branch->name,
                'address' => $branch->address,
                'phone'   => $branch->phone,
                'type'    => $branch->type,
            ] : null,
            'stats' => [
                'today'     => (clone $baseQuery())->whereDate('appointment_date', $today)->count(),
                'pending'   => (clone $baseQuery())->where('status', 'pending')->count(),
                'confirmed' => (clone $baseQuery())->where('status', 'confirmed')->count(),
                'total'     => (clone $baseQuery())->count(),
            ],
            'today_appointments' => (clone $baseQuery())
                ->with('doctor')
                ->whereDate('appointment_date', $today)
                ->orderBy('appointment_time')
                ->get()
                ->map(fn($a) => [
                    'id'                 => $a->id,
                    'appointment_number' => $a->appointment_number,
                    'patient_name'       => $a->patient_name,
                    'patient_phone'      => $a->patient_phone,
                    'appointment_time'   => $a->appointment_time,
                    'appointment_time_end' => $a->appointment_time_end,
                    'service'            => $a->service,
                    'status'             => $a->status,
                    'doctor_name'        => $a->doctor?->name,
                ]),
            'pending_appointments' => (clone $baseQuery())
                ->with('doctor')
                ->where('status', 'pending')
                ->orderBy('appointment_date')
                ->orderBy('appointment_time')
                ->limit(10)
                ->get()
                ->map(fn($a) => [
                    'id'                 => $a->id,
                    'appointment_number' => $a->appointment_number,
                    'patient_name'       => $a->patient_name,
                    'patient_phone'      => $a->patient_phone,
                    'appointment_date'   => $a->appointment_date?->format('Y-m-d') ?? '',
                    'formatted_date'     => $a->appointment_date?->format('Y.m.d') ?? '—',
                    'appointment_time'   => $a->appointment_time,
                    'service'            => $a->service,
                    'doctor_name'        => $a->doctor?->name,
                ]),
        ]);
    }

    public function profile(): Response
    {
        $user = Auth::user()->load(['role', 'branch']);

        return Inertia::render('reception/profile', [
            'user' => [
                'id'          => $user->id,
                'name'        => $user->name,
                'email'       => $user->email,
                'role'        => $user->role?->name,
                'branch_name' => $user->branch?->name,
                'branch_id'   => $user->branch_id,
                'created_at'  => $user->created_at?->format('Y.m.d'),
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'name'     => 'required|string|max:255',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $data = ['name' => $request->name];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return back()->with('success', 'Профайл шинэчлэгдлээ.');
    }
}
