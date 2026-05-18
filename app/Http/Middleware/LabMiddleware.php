<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class LabMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return redirect('/login');
        }

        $user = Auth::user();
        $portal = $user->employee?->position?->portal;

        if ($user->isAdmin() || $portal === 'lab') {
            return $next($request);
        }

        return redirect('/')->with('status', 'Хандах эрхгүй байна.');
    }
}
