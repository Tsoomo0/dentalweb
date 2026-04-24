<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        // Эхлээд doctor guard-аар нэвтрэх оролдлого
        if (Auth::guard('doctor')->attempt(['email' => $request->email, 'password' => $request->password], $request->boolean('remember'))) {
            $request->session()->regenerate();
            return redirect()->route('doctor.dashboard');
        }

        // User байгаа эсэхийг шалгах
        $user = \App\Models\User::where('email', $request->email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['Бүртгэлгүй мэйл хаяг байна.'],
            ]);
        }

        // Admin нэвтрэх
        $request->authenticate();
        $request->session()->regenerate();

        if (Auth::user()->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        if (Auth::user()->isReceptionist()) {
            return redirect()->route('reception.dashboard');
        }

        return redirect()->intended('/');
    }

    public function destroy(Request $request): RedirectResponse
    {
        // Doctor guard-аас гарах
        if (Auth::guard('doctor')->check()) {
            Auth::guard('doctor')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            return redirect('/');
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
