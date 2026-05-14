<?php

namespace App\Http\Middleware;

use App\Models\HR\Employee;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EitherAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::guard('web')->check()) {
            return $next($request);
        }

        if (Auth::guard('doctor')->check()) {
            // For doctor-only auth, only override the resolver on requests that
            // need $request->user() to be a User (e.g. Laravel broadcasting auth).
            // Other endpoints keep using Auth::guard('web')/Auth::guard('doctor') explicitly.
            if ($request->is('broadcasting/auth')) {
                $request->setUserResolver(function () {
                    $doctor = Auth::guard('doctor')->user();
                    if ($doctor?->employee_id) {
                        $emp = Employee::find($doctor->employee_id);
                        if ($emp?->user_id) {
                            return User::find($emp->user_id);
                        }
                    }
                    return null;
                });
            }
            return $next($request);
        }

        return redirect()->route('login');
    }
}
