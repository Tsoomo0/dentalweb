<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class DoctorProfileController extends Controller
{
    public function show(): Response
    {
        $doctor = Auth::guard('doctor')->user();

        return Inertia::render('doctor/profile', [
            'doctor' => array_merge($doctor->only([
                'id', 'name', 'email', 'specialization', 'degree',
                'experience_years', 'experiences', 'description',
                'phone', 'is_active',
            ]), [
                'photo_url'   => $doctor->photo ? Storage::url($doctor->photo) : null,
                'branch_name' => $doctor->branch?->name,
            ]),
        ]);
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        $doctor = Auth::guard('doctor')->user();

        if (! Hash::check($request->current_password, $doctor->password)) {
            return back()->withErrors(['current_password' => 'Одоогийн нууц үг буруу байна.']);
        }

        $doctor->update(['password' => $request->password]);

        return back()->with('success', 'Нууц үг амжилттай өөрчлөгдлөө.');
    }
}
