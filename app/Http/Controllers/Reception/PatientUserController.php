<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PatientUserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search');

        $patients = Patient::with('user')
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q2) use ($search) {
                    $q2->where('last_name', 'like', "%$search%")
                        ->orWhere('first_name', 'like', "%$search%")
                        ->orWhere('phone', 'like', "%$search%")
                        ->orWhere('patient_number', 'like', "%$search%");
                });
            })
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('reception/patient-users/index', [
            'patients' => $patients,
            'search' => $search,
        ]);
    }

    public function grantAccess(Request $request, Patient $patient): RedirectResponse
    {
        if ($patient->user_id) {
            return back()->withErrors(['error' => 'Энэ өвчтөнд нэвтрэх эрх аль хэдийн олгогдсон байна']);
        }

        $data = $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:8'],
        ], [
            'email.required' => 'Имэйл хаяг оруулна уу',
            'email.email' => 'Имэйл хаяг буруу байна',
            'email.unique' => 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна',
            'password.required' => 'Нууц үг оруулна уу',
            'password.min' => 'Нууц үг хамгийн багадаа 8 тэмдэгттэй байна',
        ]);

        $patientRole = Role::where('name', 'patient')->firstOrFail();

        $user = User::create([
            'name' => $patient->last_name.' '.$patient->first_name,
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role_id' => $patientRole->id,
        ]);

        $patient->update(['user_id' => $user->id]);

        if ($patient->email !== $data['email']) {
            $patient->update(['email' => $data['email']]);
        }

        return back()->with('success', 'Нэвтрэх эрх амжилттай олгогдлоо');
    }

    public function revokeAccess(Patient $patient): RedirectResponse
    {
        if (! $patient->user_id) {
            return back()->withErrors(['error' => 'Нэвтрэх эрх олгогдоогүй байна']);
        }

        $user = $patient->user;
        $patient->update(['user_id' => null]);
        $user?->delete();

        return back()->with('success', 'Нэвтрэх эрх цуцлагдлаа');
    }
}
