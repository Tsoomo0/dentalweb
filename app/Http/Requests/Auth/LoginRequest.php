<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey(), 900);
            RateLimiter::hit($this->ipThrottleKey(), 60);

            $this->sendFailedLoginWarning();

            throw ValidationException::withMessages([
                'email' => ['Имэйл эсвэл нууц үг буруу байна.'],
            ]);
        }

        RateLimiter::clear($this->throttleKey());
        RateLimiter::clear($this->ipThrottleKey());
    }

    public function ensureIsNotRateLimited(): void
    {
        if (RateLimiter::tooManyAttempts($this->ipThrottleKey(), 20)) {
            event(new Lockout($this));
            $secs = RateLimiter::availableIn($this->ipThrottleKey());
            throw ValidationException::withMessages([
                'email' => ["Хэт олон нэвтрэлтийн оролдлого. {$secs} секундын дараа дахин оролдоно уу."],
            ]);
        }

        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));
        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => [ceil($seconds / 60) . ' минутын дараа дахин оролдоно уу.'],
        ]);
    }

    public function sendFailedLoginWarning(string $email): void
    {
        $user = \App\Models\User::where('email', $email)->first();
        if (! $user) return;

        // 5 минутад нэг удаа л мэдэгдэл явуулна
        $throttleKey = 'login_warn:' . md5($email);
        if (Cache::has($throttleKey)) return;
        Cache::put($throttleKey, true, now()->addMinutes(5));

        $ip   = $this->ip();
        $time = now()->setTimezone('Asia/Ulaanbaatar')->format('Y-m-d H:i:s');
        $siteName = \App\Models\Setting::get('site_name', 'Dental Clinic');

        Mail::send([], [], function ($msg) use ($user, $ip, $time, $siteName) {
            $html = "
            <div style='font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff'>
                <h2 style='font-size:20px;font-weight:900;color:#111;margin:0 0 8px'>{$siteName}</h2>
                <p style='color:#555;margin:0 0 20px;font-size:15px'>Таны бүртгэлд нэвтрэх оролдлого илэрлээ</p>
                <div style='background:#fff7ed;border:2px solid #fed7aa;border-radius:16px;padding:20px;margin-bottom:20px'>
                    <p style='margin:0 0 6px;font-size:13px;color:#92400e;font-weight:700'>⚠️ Буруу нууц үг оруулсан</p>
                    <p style='margin:0;font-size:13px;color:#78350f'>Цаг: <strong>{$time}</strong></p>
                    <p style='margin:4px 0 0;font-size:13px;color:#78350f'>IP хаяг: <strong>{$ip}</strong></p>
                </div>
                <p style='color:#555;font-size:13px;margin:0'>Хэрэв энэ оролдлого та өөрөө хийгүй бол нууц үгээ яаралтай солино уу.</p>
            </div>";

            $msg->to($user->email)
                ->from(config('mail.from.address'), config('mail.from.name'))
                ->subject("{$siteName} — Нэвтрэлтийн оролдлого илэрлээ")
                ->html($html);
        });
    }

    public function throttleKey(): string
    {
        return 'login:' . Str::transliterate(Str::lower($this->string('email'))) . '|' . $this->ip();
    }

    public function ipThrottleKey(): string
    {
        return 'login_ip:' . $this->ip();
    }
}
