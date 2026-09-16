<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * CallPro webhook-ийн эх сурвалжийг баталгаажуулна.
 *
 * CallPro-д signature механизм байхгүй тул хоёр давхар хамгаалалт хийнэ:
 *   1. Нууц түлхүүр — header (X-Callpro-Token) эсвэл ?token= query
 *   2. IP whitelist — CallPro-гийн мэдэгдсэн серверүүд
 *
 * Аль нэг нь тохируулагдаагүй бол тэр шалгалт алгасагдана (тестийн үед
 * ашигтай), гэхдээ production дээр ХОЁУЛАНГ нь тохируулах ёстой.
 */
class VerifyCallProWebhook
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.callpro.webhook_token');

        if ($expected !== '') {
            $given = (string) ($request->header('X-Callpro-Token') ?: $request->query('token', ''));

            // hash_equals — цагийн зөрүүгээр түлхүүр таах халдлагаас сэргийлнэ.
            if (! hash_equals($expected, $given)) {
                Log::warning('CallPro webhook: буруу түлхүүр', ['ip' => $request->ip()]);

                return response()->json(['ok' => false], 401);
            }
        }

        $allowed = array_filter(array_map('trim', (array) config('services.callpro.allowed_ips', [])));

        if ($allowed !== [] && ! in_array($request->ip(), $allowed, true)) {
            Log::warning('CallPro webhook: бүртгэлгүй IP', ['ip' => $request->ip()]);

            return response()->json(['ok' => false], 403);
        }

        return $next($request);
    }
}
