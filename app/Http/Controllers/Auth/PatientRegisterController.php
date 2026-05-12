<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PatientRegisterController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/patient-register');
    }

    public function sendOtp(Request $request): RedirectResponse
    {
        // Turnstile шалгах (тохируулагдсан үед)
        $secret = config('services.turnstile.secret');
        if ($secret) {
            $verify = Http::asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret'   => $secret,
                'response' => $request->input('turnstile_token', ''),
                'remoteip' => $request->ip(),
            ]);
            if (! $verify->json('success')) {
                throw ValidationException::withMessages([
                    'turnstile_token' => ['Captcha баталгаажуулалт амжилтгүй. Дахин оролдоно уу.'],
                ]);
            }
        }

        $data = $request->validate([
            'last_name'     => ['required', 'string', 'max:100'],
            'first_name'    => ['required', 'string', 'max:100'],
            'gender'        => ['nullable', 'in:male,female,other'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'phone'         => ['required', 'string', 'max:20'],
            'address'       => ['nullable', 'string', 'max:500'],
            'email'         => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'      => ['required', 'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols()
            ],
        ], [
            'last_name.required'  => 'Овог оруулна уу',
            'first_name.required' => 'Нэр оруулна уу',
            'phone.required'      => 'Утасны дугаар оруулна уу',
            'email.required'      => 'Имэйл хаяг оруулна уу',
            'email.email'         => 'Имэйл хаяг буруу байна',
            'email.unique'        => 'Энэ имэйл хаяг бүртгэлтэй байна',
            'password.required'   => 'Нууц үг оруулна уу',
            'password.confirmed'  => 'Нууц үг таарахгүй байна',
            'password.min'        => 'Нууц үг хамгийн багадаа 8 тэмдэгттэй байна',
            'password.mixed_case' => 'Нууц үгд том болон жижиг үсэг хоёулаа байх ёстой',
            'password.numbers'    => 'Нууц үгд дор хаяж нэг тоо байх ёстой',
            'password.symbols'    => 'Нууц үгд дор хаяж нэг тусгай тэмдэгт (! @ # $ ...) байх ёстой',
        ]);

        $this->createAccount($data);

        return redirect()->route('patient.dashboard');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function createAccount(array $data): void
    {
        $patientRole = Role::where('name', 'patient')->first();

        $user = User::create([
            'name'     => $data['last_name'] . ' ' . $data['first_name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role_id'  => $patientRole?->id,
        ]);

        $existing = Patient::whereNull('user_id')
            ->where(fn($q) =>
                $q->where('email', $data['email'])
                  ->orWhere('phone', $data['phone'])
            )
            ->orderByDesc('created_at')
            ->first();

        if ($existing) {
            $existing->update([
                'user_id'       => $user->id,
                'email'         => $data['email'],
                'last_name'     => $existing->last_name  ?: $data['last_name'],
                'first_name'    => $existing->first_name ?: $data['first_name'],
                'gender'        => $existing->gender        ?? ($data['gender'] ?? null),
                'date_of_birth' => $existing->date_of_birth ?? ($data['date_of_birth'] ?? null),
                'address'       => $existing->address       ?? ($data['address'] ?? null),
            ]);
            $patient = $existing;
        } else {
            $patient = Patient::create([
                'user_id'        => $user->id,
                'patient_number' => Patient::generateNumber(),
                'last_name'      => $data['last_name'],
                'first_name'     => $data['first_name'],
                'gender'         => $data['gender'] ?? null,
                'date_of_birth'  => $data['date_of_birth'] ?? null,
                'phone'          => $data['phone'],
                'address'        => $data['address'] ?? null,
                'email'          => $data['email'],
            ]);
        }

        Appointment::whereNull('patient_id')
            ->where(fn($q) =>
                $q->where('patient_email', $data['email'])
                  ->orWhere('patient_phone', $data['phone'])
            )
            ->update(['patient_id' => $patient->id]);

        Auth::login($user);
    }

}
