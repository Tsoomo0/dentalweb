<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class DoctorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::guard('doctor')->check()) {
            return redirect()->route('login')->with('status', 'Эмчийн нэвтрэх эрх шаардлагатай.');
        }

        $doctor = Auth::guard('doctor')->user();

        if (! $doctor->is_active) {
            Auth::guard('doctor')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('status', 'Таны эрх түр хаагдсан байна. Дэлгэрэнгүй мэдээллийг удирдлагаас авна уу.');
        }

        return $next($request);
    }
}
