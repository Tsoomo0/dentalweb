<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\Setting;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $token = $request->query('t');
        $pending = $token ? Cache::get('2fa:'.$token) : null;

        if (! $pending) {
            return redirect()->route('login');
        }

        if ($pending['expires_at'] < now()->timestamp) {
            Cache::forget('2fa:'.$token);

            return redirect()->route('login')->with('error', 'Кодын хугацаа дууссан. Дахин нэвтэрнэ үү.');
        }

        return Inertia::render('auth/two-factor', [
            'token' => $token,
            'masked_email' => $this->maskEmail($pending['email']),
            'status' => session('status'),
        ]);
    }

    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'digits:6'],
            'token' => ['required', 'string'],
        ], [
            'code.required' => 'Баталгаажуулах кодыг оруулна уу',
            'code.digits' => 'Код 6 оронтой тоо байх ёстой',
            'token.required' => 'Токен олдсонгүй. Дахин нэвтэрнэ үү.',
        ]);

        $cacheKey = '2fa:'.$request->token;
        $pending = Cache::get($cacheKey);

        if (! $pending) {
            return redirect()->route('login')
                ->with('error', 'Хуралдааны хугацаа дууссан байна. Дахин нэвтэрнэ үү.');
        }

        if ($pending['expires_at'] < now()->timestamp) {
            Cache::forget($cacheKey);

            return redirect()->route('login')->with('error', 'Кодын хугацаа дууссан. Дахин нэвтэрнэ үү.');
        }

        if ($pending['attempts'] >= 5) {
            Cache::forget($cacheKey);

            return redirect()->route('login')
                ->with('error', 'Буруу код хэт олон удаа оруулсан. Дахин нэвтэрнэ үү.');
        }

        if (! hash_equals($pending['code'], $request->code)) {
            $pending['attempts']++;
            Cache::put($cacheKey, $pending, now()->addMinutes(10));
            $left = 5 - $pending['attempts'];
            throw ValidationException::withMessages([
                'code' => ["Код буруу байна. {$left} оролдлого үлдлээ."],
            ]);
        }

        Cache::forget($cacheKey);
        $request->session()->regenerate();

        if ($pending['guard'] === 'doctor') {
            $doctor = Doctor::findOrFail($pending['user_id']);
            Auth::guard('doctor')->login($doctor, $pending['remember']);
            AuditService::log('login', $doctor, null, null, 'Эмч 2FA нэвтэрсэн');

            return $doctor->employee_id
                ? redirect()->route('portal.select')
                : redirect()->route('doctor.dashboard');
        }

        $user = User::findOrFail($pending['user_id']);
        Auth::guard('web')->login($user, $pending['remember']);
        AuditService::log('login', $user, null, null, '2FA нэвтэрсэн');

        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }
        if ($user->isPatient()) {
            return redirect()->route('patient.dashboard');
        }

        return redirect()->route('portal.select');
    }

    public function resend(Request $request): RedirectResponse
    {
        $token = $request->input('token');
        if (! $token) {
            return redirect()->route('login');
        }

        $resendKey = '2fa_resend:'.$token;
        if (RateLimiter::tooManyAttempts($resendKey, 3)) {
            return back()->with('error', 'Код дахин илгээх хязгаарт хүрлээ. Арай дараа оролдоно уу.');
        }
        RateLimiter::hit($resendKey, 300);

        $cacheKey = '2fa:'.$token;
        $pending = Cache::get($cacheKey);
        if (! $pending) {
            return redirect()->route('login');
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $pending['code'] = $otp;
        $pending['attempts'] = 0;
        $pending['expires_at'] = now()->addMinutes(10)->timestamp;
        Cache::put($cacheKey, $pending, now()->addMinutes(10));

        $this->sendOtp($pending['email'], $otp);

        return back()->with('status', 'Шинэ баталгаажуулах код илгээлээ.');
    }

    // ── Static helper ──────────────────────────────────────────────────────────

    public static function initiate(int $userId, string $email, string $guard, bool $remember): string
    {
        $token = Str::random(40);
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put('2fa:'.$token, [
            'user_id' => $userId,
            'email' => $email,
            'guard' => $guard,
            'remember' => $remember,
            'code' => $otp,
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10)->timestamp,
        ], now()->addMinutes(10));

        (new self)->sendOtp($email, $otp);

        return $token;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function sendOtp(string $email, string $otp): void
    {
        $siteName = Setting::get('site_name', 'Dental Clinic');

        Mail::send([], [], function ($msg) use ($email, $otp, $siteName) {
            $html = "
            <div style='font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff'>
                <h2 style='font-size:20px;font-weight:900;color:#111;margin:0 0 8px'>{$siteName}</h2>
                <p style='color:#555;margin:0 0 24px;font-size:15px'>Нэвтрэлтийн баталгаажуулах код</p>
                <div style='background:#eff6ff;border:2px dashed #93c5fd;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px'>
                    <p style='margin:0 0 8px;font-size:13px;color:#999'>Доорх кодыг оруулна уу</p>
                    <span style='font-size:44px;font-weight:900;letter-spacing:18px;color:#2563eb;font-family:monospace'>{$otp}</span>
                </div>
                <p style='color:#888;font-size:13px;margin:0'>Энэ код <strong>10 минут</strong>ын дараа хугацаа дуусна.</p>
                <p style='color:#bbb;font-size:12px;margin:12px 0 0'>Хэрэв та нэвтрэхийг хүсээгүй бол нууц үгээ яаралтай солино уу.</p>
            </div>";

            $msg->to($email)
                ->from(config('mail.from.address'), config('mail.from.name'))
                ->subject("{$siteName} — Нэвтрэлтийн баталгаажуулах код: {$otp}")
                ->html($html);
        });
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $show = min(2, strlen($local));
        $masked = substr($local, 0, $show).str_repeat('*', max(0, strlen($local) - $show));

        return $masked.'@'.$domain;
    }
}
