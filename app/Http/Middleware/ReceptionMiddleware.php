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
        if (! Auth::check() || ! Auth::user()->is_active) {
            return redirect('/')->with('status', 'Нэвтрэх эрх байхгүй байна.');
        }

        $user = Auth::user();

        // 1) Хэрэглэгчийн role нь admin эсвэл receptionist бол шууд зөвшөөрнө
        if ($user->isStaff()) {
            return $next($request);
        }

        // 2) Эсвэл employee.extra_portals дотор 'reception' байвал зөвшөөрнө
        //    (жишээ нь сувилагч хааяа ресепшний ажил гүйцэтгэдэг)
        if ($user->employee?->canAccessPortal('reception')) {
            return $next($request);
        }

        return redirect('/')->with('status', 'Нэвтрэх эрх байхгүй байна.');
    }
}
