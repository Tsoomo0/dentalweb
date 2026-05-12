<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('my/change-password');
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:6|confirmed',
        ]);

        if (Auth::guard('doctor')->check()) {
            $doctor = Auth::guard('doctor')->user();
            if (!Hash::check($request->current_password, $doctor->password)) {
                return back()->withErrors(['current_password' => 'Одоогийн нууц үг буруу байна.']);
            }
            $newHash = Hash::make($request->password);
            $doctor->update(['password' => $newHash]);
            // Linked user record-ийг ч шинэчлэх
            $doctor->employee?->user?->update(['password' => $newHash]);
        } else {
            $user = Auth::user();
            if (!Hash::check($request->current_password, $user->password)) {
                return back()->withErrors(['current_password' => 'Одоогийн нууц үг буруу байна.']);
            }
            $newHash = Hash::make($request->password);
            $user->update(['password' => $newHash]);
            // Linked doctor record-ийг ч шинэчлэх
            $user->employee?->doctor?->update(['password' => $newHash]);
        }

        return back()->with('success', 'Нууц үг амжилттай солигдлоо.');
    }
}
