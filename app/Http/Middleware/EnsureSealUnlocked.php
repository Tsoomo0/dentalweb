<?php

namespace App\Http\Middleware;

use App\Services\HR\SealLock;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Тамга, захирлын гарын үсэгт хүрэх үйлдлийг PIN кодын түгжээгээр хамгаална.
 *
 * Түгжээ нээгдээгүй бол:
 *  - Inertia хүсэлт → буцаж алдаа (`seal`) харуулна
 *  - fetch/JSON хүсэлт → 423 Locked
 */
class EnsureSealUnlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        if (SealLock::isUnlocked($request)) {
            return $next($request);
        }

        $message = 'Түгжээ хаалттай байна. Хамгаалалтын кодоо оруулна уу.';

        if ($request->header('X-Inertia')) {
            return back()->withErrors(['seal' => $message]);
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => $message, 'seal_locked' => true], 423);
        }

        return back()->withErrors(['seal' => $message]);
    }
}
