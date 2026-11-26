<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cuticul Hub-д нэвтрүүлэх (SSO).
 *
 * Hub → GET /sso/hub?return=/tools  →  (нэвтрээгүй бол login + 2FA)  →  Hub /sso/callback?token=...
 *
 * Token: base64url(json) . "." . base64url(hmac_sha256(base64url(json), HUB_SSO_SECRET))
 * 60 секунд хүчинтэй, nonce-оор нэг л удаа ашиглагдана (Hub шалгана).
 * Үйлчлүүлэгч (patient) болон идэвхгүй хэрэглэгч Hub-д орохгүй.
 */
class HubSsoController extends Controller
{
    private const SESSION_KEY = 'hub_sso_return';

    public function __invoke(Request $request): Response
    {
        $hub = config('hub.url');
        $secret = config('hub.sso_secret');
        abort_if($hub === '' || strlen($secret) < 32, 404);

        $return = self::safePath($request->query('return'));

        // Hub-ээс гарсан хүн дахин нэвтэрч байна: ERP-ийн session-ийг хааж нэр, нууц үг (+2FA)-г заавал асууна.
        // Дундын компьютер дээр өмнөх хүний ERP session-оор Hub-д орохоос сэргийлнэ.
        // resume() нь prompt-гүйгээр буцаадаг тул давталт үүсэхгүй.
        if ($request->query('prompt') === 'login') {
            foreach (['web', 'doctor'] as $guard) {
                if (Auth::guard($guard)->check()) {
                    Auth::guard($guard)->logout();
                }
            }
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            $request->session()->put(self::SESSION_KEY, $return);

            $response = redirect()->route('login');
            foreach ($request->cookies->all() as $name => $value) {
                if (str_starts_with($name, 'remember_')) {
                    $response->withCookie(Cookie::forget($name));
                }
            }

            return $response;
        }

        $user = Auth::guard('web')->user();
        $doctor = $user ? null : Auth::guard('doctor')->user();

        if (! $user && ! $doctor) {
            // Нэвтэрсний дараа resume() энд буцаана
            $request->session()->put(self::SESSION_KEY, $return);

            return redirect()->route('login');
        }

        if ($user) {
            abort_if($user->isPatient() || ! $user->is_active, 403, 'Cuticul Hub-д зөвхөн ажилчид нэвтэрнэ.');
            $claims = [
                'sub' => 'user:'.$user->id,
                'name' => $user->name,
                'email' => $user->email,
                'admin' => $user->isAdmin(),
            ];
        } else {
            abort_if(! $doctor->is_active, 403, 'Cuticul Hub-д зөвхөн идэвхтэй ажилчид нэвтэрнэ.');
            $claims = [
                'sub' => 'doctor:'.$doctor->id,
                'name' => $doctor->name,
                'email' => $doctor->email,
                'admin' => false,
            ];
        }

        $now = time();
        $body = self::b64(json_encode($claims + ['iat' => $now, 'exp' => $now + 60, 'nonce' => Str::random(32)], JSON_UNESCAPED_UNICODE));
        $token = $body.'.'.self::b64(hash_hmac('sha256', $body, $secret, true));

        // Inertia login form-ын (XHR) дараа ирвэл өөр домэйн руу 409 + X-Inertia-Location-оор шилжинэ
        return Inertia::location($hub.'/sso/callback?'.http_build_query(['token' => $token, 'return' => $return]));
    }

    /**
     * Hub-ээс ирээд login хийсэн бол Hub руу үргэлжлүүлнэ. Login/2FA амжилттай болсны дараа дуудна.
     */
    public static function resume(Request $request): ?RedirectResponse
    {
        if (! $request->session()->has(self::SESSION_KEY)) {
            return null;
        }

        return redirect()->route('hub.sso', ['return' => $request->session()->pull(self::SESSION_KEY)]);
    }

    private static function safePath(mixed $path): string
    {
        return is_string($path) && preg_match('#^/(?![/\\\\])[^\s]*$#', $path) ? $path : '/';
    }

    private static function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
