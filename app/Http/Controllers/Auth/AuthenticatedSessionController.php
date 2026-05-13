<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        // Rate limit шалгах
        $request->ensureIsNotRateLimited();

        $credentials = ['email' => $request->email, 'password' => $request->password];

        // ── Doctor guard ──────────────────────────────────────────────────────
        if (Auth::guard('doctor')->validate($credentials)) {
            RateLimiter::clear($request->throttleKey());
            RateLimiter::clear($request->ipThrottleKey());

            $doctor = Auth::guard('doctor')->getLastAttempted();
            Auth::guard('doctor')->login($doctor, $request->boolean('remember'));
            $request->session()->regenerate();
            return $doctor->employee_id
                ? redirect()->route('portal.select')
                : redirect()->route('doctor.dashboard');
        }

        // ── Web guard ─────────────────────────────────────────────────────────
        if (! Auth::guard('web')->validate($credentials)) {
            RateLimiter::hit($request->throttleKey(), 900);
            RateLimiter::hit($request->ipThrottleKey(), 60);

            $user = User::where('email', $request->email)->first();
            if ($user) {
                $request->sendFailedLoginWarning($user->email);
            }

            throw ValidationException::withMessages([
                'email' => [! $user ? 'Бүртгэлгүй мэйл хаяг байна.' : 'Имэйл эсвэл нууц үг буруу байна.'],
            ]);
        }

        RateLimiter::clear($request->throttleKey());
        RateLimiter::clear($request->ipThrottleKey());

        $user = Auth::guard('web')->getLastAttempted();
        Auth::guard('web')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        if ($user->isAdmin())   return redirect()->route('admin.dashboard');
        if ($user->isPatient()) return redirect()->route('patient.dashboard');
        return redirect()->route('portal.select');
    }

    public function destroy(Request $request): RedirectResponse
    {
        // Бүх guard-аас зэрэг гаргах + remember cookie арилгах
        foreach (['web', 'doctor'] as $guard) {
            if (\Illuminate\Support\Facades\Auth::guard($guard)->check()) {
                \Illuminate\Support\Facades\Auth::guard($guard)->logout();
            }
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Remember-me cookie-уудыг устгах
        $response = redirect('/');
        foreach ($request->cookies->all() as $name => $value) {
            if (str_starts_with($name, 'remember_')) {
                $response->withCookie(\Illuminate\Support\Facades\Cookie::forget($name));
            }
        }

        return $response;
    }
}
