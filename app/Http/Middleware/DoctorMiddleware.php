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
        if (Auth::guard('doctor')->check()) {
            return $next($request);
        }

        return redirect()->route('login')->with('status', 'Эмчийн нэвтрэх эрх шаардлагатай.');
    }
}
