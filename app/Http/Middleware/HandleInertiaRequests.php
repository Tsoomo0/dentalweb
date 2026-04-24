<?php

namespace App\Http\Middleware;

use App\Models\JobApplication;
use App\Models\Setting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return array_merge(parent::share($request), [
            ...parent::share($request),
            'name'  => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],

            // ─── Flash messages (бүх хуудсанд) ───────────────────────────────
            'flash' => [
                'success'          => fn () => $request->session()->get('success'),
                'error'            => fn () => $request->session()->get('error'),
                'info'             => fn () => $request->session()->get('info'),
                'warning'          => fn () => $request->session()->get('warning'),
                'booking_success'  => fn () => $request->session()->get('booking_success'),
                'inperson_success' => fn () => $request->session()->get('inperson_success'),
            ],

            // ─── Нийтийн тохиргоо (нийтийн хуудсуудад хэрэглэнэ) ────────────
            'site_settings' => fn () => Setting::whereIn('key', [
                'site_name', 'site_tagline',
                'contact_phone', 'contact_email',
                'address', 'working_hours',
                'facebook_url', 'instagram_url',
                'booking_enabled', 'maintenance_mode',
                'site_logo', 'site_favicon',
            ])->pluck('value', 'key')->toArray(),

            // ─── Admin notifications ──────────────────────────────────────────
            'pending_job_applications' => fn () => $request->user()
                ? JobApplication::where('status', 'pending')->count()
                : 0,

            // ─── Auth ─────────────────────────────────────────────────────────
            'auth' => [
                'user'   => $request->user(),
                'doctor' => Auth::guard('doctor')->check()
                    ? (function () {
                        $d = Auth::guard('doctor')->user();
                        return array_merge($d->only(['id', 'name', 'email', 'specialization', 'has_online_booking']), [
                            'photo_url' => $d->photo ? Storage::url($d->photo) : null,
                        ]);
                    })()
                    : null,
            ],
        ]);
    }
}
