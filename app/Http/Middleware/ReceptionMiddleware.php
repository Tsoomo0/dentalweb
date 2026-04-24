<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ReceptionMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check() && Auth::user()->isStaff() && Auth::user()->is_active) {
            return $next($request);
        }

        return redirect('/')->with('status', 'Нэвтрэх эрх байхгүй байна.');
    }
}
