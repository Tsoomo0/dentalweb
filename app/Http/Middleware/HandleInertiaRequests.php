<?php

namespace App\Http\Middleware;

use App\Models\HR\Employee;
use App\Models\JobApplication;
use App\Models\Setting;
use App\Models\TreatmentCategory;
use App\Models\TreatmentRecord;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
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
    public static function portalNotifTypes(string $path): ?array
    {
        if (str_starts_with($path, 'doctor/')) {
            return ['PayrollSlipSent', 'ReceptionBonusSent', 'NurseBonusSent', 'LeaveRequestDecision', 'VacationRequestDecision', 'BookRentalDecision', 'EquipmentAssigned', 'EquipmentReturnedByAdmin', 'FeedbackResponded', 'WarningIssued', 'OrthoVisitSigned', 'GeneralVisitSigned'];
        }
        if (str_starts_with($path, 'hr/')) {
            return ['NewJobApplication', 'LeaveRequestSubmitted', 'VacationRequestSubmitted', 'BookRentalSubmitted', 'EquipmentAssignmentResponse', 'FeedbackSubmitted', 'WarningAcknowledged'];
        }
        if (str_starts_with($path, 'reception/')) {
            return ['NewAppointment', 'DailySheetConfirmed', 'OutstandingPaid', 'TreatmentSentToReception', 'ConsentFormSigned', 'PatientAppointmentRequested', 'LabOrderReady'];
        }
        if (str_starts_with($path, 'lab/')) {
            return ['LabOrderCreated'];
        }
        if (str_starts_with($path, 'patient/')) {
            return ['ConsentRequestSent', 'AppointmentBookedPatient', 'AppointmentConfirmedPatient', 'OrthoSignatureRequested', 'GeneralVisitSignatureRequested'];
        }
        if (str_starts_with($path, 'my/')) {
            return ['PayrollSlipSent', 'ReceptionBonusSent', 'NurseBonusSent', 'LeaveRequestDecision', 'VacationRequestDecision', 'BookRentalDecision', 'EquipmentAssigned', 'EquipmentReturnedByAdmin', 'FeedbackResponded', 'WarningIssued'];
        }

        return null; // admin sees all
    }

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

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],

            // ─── Flash messages (бүх хуудсанд) ───────────────────────────────
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
                'warning' => fn () => $request->session()->get('warning'),
                'booking_success' => fn () => $request->session()->get('booking_success'),
                'inperson_success' => fn () => $request->session()->get('inperson_success'),
            ],

            // ─── Нийтийн тохиргоо (cache-тай) ───────────────────────────────
            'site_settings' => fn () => Cache::remember('inertia_site_settings', 3600, function () {
                return Setting::whereIn('key', [
                    'site_name', 'site_tagline',
                    'contact_phone', 'contact_email',
                    'address', 'working_hours',
                    'facebook_url', 'instagram_url',
                    'booking_enabled', 'maintenance_mode',
                    'site_logo', 'site_favicon',
                ])->pluck('value', 'key')->toArray();
            }),

            // ─── Footer үйлчилгээний ангилал (cache 1h) ──────────────────────
            'footer_services' => fn () => Cache::remember('footer_services', 3600, fn () => TreatmentCategory::with([
                'treatments' => fn ($q) => $q->where('is_active', true)->orderBy('order')->select(['id', 'title', 'treatment_category_id']),
            ])->where('is_active', true)->orderBy('order')->get(['id', 'name'])->toArray()
            ),

            // ─── Admin notifications ──────────────────────────────────────────
            'pending_job_applications' => fn () => $request->user()
                ? JobApplication::where('status', 'pending')->count()
                : 0,

            // ─── Ресепшн: эмчилгээний хүлээгдэж буй төлбөр ──────────────────
            'pending_treatment_payments' => fn () => $request->user()
                ? TreatmentRecord::where('payment_status', 'sent')
                    ->when($request->user()->branch_id, fn ($q) => $q->whereHas('doctor', fn ($d) => $d->where('branch_id', $request->user()->branch_id))
                    )->count()
                : 0,

            'notifications' => function () use ($request) {
                // Web guard (admin, receptionist, HR employee)
                $user = $request->user();

                // Doctor guard → find linked employee's user account
                if (! $user && Auth::guard('doctor')->check()) {
                    $doctor = Auth::guard('doctor')->user();
                    if ($doctor->employee_id) {
                        $emp = Employee::with('user')->find($doctor->employee_id);
                        $user = $emp?->user;
                    }
                }

                if (! $user) {
                    return null;
                }

                $allowed = self::portalNotifTypes($request->path());
                $typeClasses = $allowed
                    ? collect($allowed)->map(fn ($t) => "App\\Notifications\\{$t}")->toArray()
                    : null;

                $query = $user->notifications()->latest();
                if ($typeClasses) {
                    $query->whereIn('type', $typeClasses);
                }

                return [
                    'unread_count' => $typeClasses
                        ? $user->unreadNotifications()->whereIn('type', $typeClasses)->count()
                        : $user->unreadNotifications()->count(),
                    'items' => $query->take(15)->get()->map(fn ($n) => [
                        'id' => $n->id,
                        'notif_type' => class_basename($n->type),
                        'data' => $n->data,
                        'read_at' => $n->read_at?->toIso8601String(),
                        'created_at' => $n->created_at->diffForHumans(),
                    ])->all(),
                ];
            },

            // ─── Auth ─────────────────────────────────────────────────────────
            'auth' => [
                'user' => $request->user(),
                // Unified chat user_id (works for both web and doctor guards).
                'chat_user_id' => function () use ($request) {
                    if ($u = $request->user()) {
                        return $u->id;
                    }
                    if (Auth::guard('doctor')->check()) {
                        $d = Auth::guard('doctor')->user();
                        if ($d?->employee_id) {
                            $emp = Employee::find($d->employee_id);

                            return $emp?->user_id;
                        }
                    }

                    return null;
                },
                'doctor' => fn () => Auth::guard('doctor')->check()
                    ? (function () {
                        $d = Auth::guard('doctor')->user();

                        return array_merge($d->only(['id', 'name', 'email', 'specialization', 'has_online_booking', 'employee_id']), [
                            'photo_url' => $d->photo ? Storage::url($d->photo) : null,
                            'senior_doctors' => $d->seniorDoctors()->get(['doctors.id', 'doctors.name'])
                                ->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])
                                ->toArray(),
                        ]);
                    })()
                    : null,
                'employee' => fn () => (function () use ($request) {
                    if (Auth::guard('doctor')->check()) {
                        $doctor = Auth::guard('doctor')->user();
                        if (! $doctor->employee_id) {
                            return null;
                        }
                        $emp = Employee::with('position')->find($doctor->employee_id);
                    } elseif ($request->user()) {
                        $emp = Employee::with('position')
                            ->where('user_id', $request->user()->id)->first();
                    } else {
                        return null;
                    }
                    if (! $emp) {
                        return null;
                    }

                    return [
                        'full_name' => $emp->full_name,
                        'photo_url' => $emp->photo_url,
                        'position' => $emp->position?->name,
                        'portal' => $emp->position?->portal,
                    ];
                })(),
            ],
        ];
    }
}
