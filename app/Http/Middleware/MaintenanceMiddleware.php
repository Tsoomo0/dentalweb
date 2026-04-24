<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MaintenanceMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Setting::get('maintenance_mode', '0') === '1') {
            // Admin нэвтэрсэн бол тойрч өнгөрнө
            if ($request->user() && $request->user()->role?->name === 'admin') {
                return $next($request);
            }

            // Auth, admin, payment callback route-уудыг тойрно
            if ($request->routeIs('login', 'logout', 'payment.callback')) {
                return $next($request);
            }

            return response()->view('errors.maintenance', [], 503);
        }

        return $next($request);
    }
}
