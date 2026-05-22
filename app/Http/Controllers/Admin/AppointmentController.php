<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateMeetLink;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Treatment;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Appointment::with(['doctor', 'branch'])
            ->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('date')) {
            $query->whereDate('appointment_date', $request->date);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('month')) {
            $query->whereYear('appointment_date', substr($request->month, 0, 4))
                ->whereMonth('appointment_date', substr($request->month, 5, 2));
        } elseif (! $request->filled('date') && ! $request->filled('status')) {
            $query->whereBetween('appointment_date', [
                now()->subMonth()->startOfMonth()->toDateString(),
                now()->addMonths(2)->endOfMonth()->toDateString(),
            ]);
        }

        $appointments = $query->get()->map(fn ($a) => [
            'id' => $a->id,
            'appointment_number' => $a->appointment_number,
            'patient_id' => $a->patient_id,
            'patient_name' => $a->patient_name,
            'patient_phone' => $a->patient_phone,
            'patient_email' => $a->patient_email,
            'doctor_id' => $a->doctor_id,
            'doctor_name' => $a->doctor?->name,
            'doctor_spec' => $a->doctor?->specialization,
            'branch_id' => $a->branch_id,
            'branch_name' => $a->branch?->name,
            'service' => $a->service,
            'type' => $a->type,
            'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
            'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
            'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
            'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
            'status' => $a->status,
            'payment_status' => $a->payment_status,
            'notes' => $a->notes,
            'admin_notes' => $a->admin_notes,
            'created_by' => $a->created_by,
            'confirmed_by' => $a->confirmed_by,
        ]);

        $today = now()->toDateString();

        $creators = Appointment::whereNotNull('created_by')
            ->distinct()
            ->pluck('created_by')
            ->sort()
            ->values();

        return Inertia::render('admin/appointments/index', [
            'appointments' => $appointments,
            'doctors' => Doctor::where('is_active', true)->with('branches')->orderBy('name')->get()->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'specialization' => $d->specialization,
                'branch_id' => $d->branch_id,
                'branch_ids' => $d->branches->pluck('id')->toArray(),
                'photo_url' => $d->photo ? Storage::url($d->photo) : null,
            ]),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'treatments' => Treatment::where('is_active', true)->orderBy('order')->get(['id', 'title']),
            'creators' => $creators,
            'filters' => $request->only('status', 'doctor_id', 'branch_id', 'date', 'type'),
            'stats' => [
                'total' => Appointment::count(),
                'pending' => Appointment::where('status', 'pending')->count(),
                'confirmed' => Appointment::where('status', 'confirmed')->count(),
                'today' => Appointment::whereDate('appointment_date', $today)->count(),
                'cancelled' => Appointment::where('status', 'cancelled')->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/appointments/create', [
            'doctors' => Doctor::where('is_active', true)->with('branches')->orderBy('name')->get()->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'specialization' => $d->specialization,
                'branch_id' => $d->branch_id,
                'branch_ids' => $d->branches->pluck('id')->toArray(),
            ]),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // patient_name эсвэл patient_first_name (+ optional last_name) аль аль форматыг хүлээж авна
        $request->validate([
            'patient_id' => 'nullable|exists:patients,id',
            'patient_name' => 'nullable|string|max:255',
            'patient_last_name' => 'nullable|string|max:255',
            'patient_first_name' => 'nullable|string|max:255',
            'patient_phone' => 'required|string|max:50',
            'patient_email' => 'nullable|email|max:255',
            'doctor_id' => 'nullable|exists:doctors,id',
            'branch_id' => 'nullable|exists:branches,id',
            'service' => 'nullable|string|max:255',
            'type' => 'required|in:online,in_person',
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time' => 'required',
            'appointment_time_end' => ['nullable', 'date_format:H:i', function ($attr, $value, $fail) use ($request) {
                if ($value && $request->appointment_time && $value <= $request->appointment_time) {
                    $fail('Дуусах цаг эхлэх цагаас хойш байх ёстой.');
                }
            }],
            'status' => 'required|in:pending,confirmed,cancelled,completed',
            'notes' => 'nullable|string',
            'admin_notes' => 'nullable|string',
        ]);

        // Нэр шинжилгээ — first_name + last_name эсвэл patient_name-аас зохионо
        $lastName  = trim((string) $request->patient_last_name);
        $firstName = trim((string) $request->patient_first_name);
        if (! $firstName && ! $lastName && $request->patient_name) {
            $parts = preg_split('/\s+/', trim($request->patient_name), 2);
            $lastName  = $parts[0] ?? '';
            $firstName = $parts[1] ?? $parts[0] ?? '';
        }
        if (! $firstName) {
            return back()->withErrors(['patient_first_name' => 'Үйлчлүүлэгчийн нэр оруулна уу.'])->withInput();
        }
        $patientName = trim($lastName.' '.$firstName);

        // Хуучин patient_id ирвэл түүнийг ашиглана, үгүй бол утсаар хайж firstOrCreate
        $patientId = $request->patient_id;
        if (! $patientId) {
            $patient = Patient::firstOrCreate(
                ['phone' => $request->patient_phone],
                [
                    'patient_number' => Patient::generateNumber(),
                    'last_name' => $lastName,
                    'first_name' => $firstName,
                    'email' => $request->patient_email,
                    'created_by' => Auth::id(),
                ]
            );
            $patientId = $patient->id;
        }

        $appointment = Appointment::create([
            'appointment_number' => Appointment::generateNumber(),
            'created_by' => Auth::user()?->name ?? 'Админ',
            'created_by_id' => Auth::id(),
            'patient_id' => $patientId,
            'patient_name' => $patientName,
            'patient_last_name' => $lastName,
            'patient_first_name' => $firstName,
            ...$request->only(
                'patient_phone', 'patient_email',
                'doctor_id', 'branch_id', 'service', 'type',
                'appointment_date', 'appointment_time', 'appointment_time_end',
                'status', 'notes', 'admin_notes'
            ),
        ]);

        AuditService::log('created', $appointment, null, $appointment->toArray(), "Захиалга үүсгэв: {$appointment->appointment_number}");

        return redirect()->route('admin.appointments.index')->with('success', 'Цаг захиалга амжилттай нэмэгдлээ.');
    }

    public function show(Appointment $appointment): Response
    {
        $appointment->load(['doctor.branch', 'branch']);

        return Inertia::render('admin/appointments/show', [
            'appointment' => array_merge($appointment->toArray(), [
                'doctor_name' => $appointment->doctor?->name,
                'doctor_spec' => $appointment->doctor?->specialization,
                'branch_name' => $appointment->branch?->name,
                'formatted_date' => $appointment->appointment_date?->format('Y.m.d') ?? '—',
            ]),
            'doctors' => Doctor::where('is_active', true)->with('branches')->orderBy('name')->get()->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'specialization' => $d->specialization,
                'branch_id' => $d->branch_id,
                'branch_ids' => $d->branches->pluck('id')->toArray(),
            ]),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate([
            'patient_name' => 'nullable|string|max:255',
            'patient_last_name' => 'nullable|string|max:255',
            'patient_first_name' => 'nullable|string|max:255',
            'patient_phone' => 'required|string|max:50',
            'patient_email' => 'nullable|email|max:255',
            'doctor_id' => 'nullable|exists:doctors,id',
            'branch_id' => 'nullable|exists:branches,id',
            'service' => 'nullable|string|max:255',
            'type' => 'required|in:online,in_person',
            'appointment_date' => 'nullable|date',
            'appointment_time' => 'nullable',
            'appointment_time_end' => ['nullable', 'date_format:H:i', function ($attr, $value, $fail) use ($request) {
                if ($value && $request->appointment_time && $value <= $request->appointment_time) {
                    $fail('Дуусах цаг эхлэх цагаас хойш байх ёстой.');
                }
            }],
            'status' => 'required|in:pending,confirmed,cancelled,completed',
            'notes' => 'nullable|string',
            'admin_notes' => 'nullable|string',
        ]);

        $lastName  = trim((string) $request->patient_last_name);
        $firstName = trim((string) $request->patient_first_name);
        if (! $firstName && ! $lastName && $request->patient_name) {
            $parts = preg_split('/\s+/', trim($request->patient_name), 2);
            $lastName  = $parts[0] ?? '';
            $firstName = $parts[1] ?? $parts[0] ?? '';
        }
        if (! $firstName) {
            return back()->withErrors(['patient_first_name' => 'Үйлчлүүлэгчийн нэр оруулна уу.'])->withInput();
        }
        $patientName = trim($lastName.' '.$firstName);

        $old = $appointment->only('status', 'doctor_id', 'appointment_date', 'appointment_time');
        $appointment->update([
            'patient_name' => $patientName,
            'patient_last_name' => $lastName,
            'patient_first_name' => $firstName,
            ...$request->only(
                'patient_phone', 'patient_email',
                'doctor_id', 'branch_id', 'service', 'type',
                'appointment_date', 'appointment_time', 'appointment_time_end',
                'status', 'notes', 'admin_notes'
            ),
        ]);

        AuditService::log('updated', $appointment, $old, $appointment->fresh()->only('status', 'doctor_id', 'appointment_date', 'appointment_time'), "Захиалга шинэчлэв: {$appointment->appointment_number}");

        return back()->with('success', 'Захиалга шинэчлэгдлээ.');
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
        AuditService::log('deleted', $appointment, $appointment->only('patient_name', 'appointment_number', 'status'), null, "Захиалга устгав: {$appointment->appointment_number}");
        $appointment->delete();

        return back()->with('success', 'Цаг захиалга устгагдлаа.');
    }

    public function search(Request $request): Response
    {
        $query = Appointment::with(['doctor', 'branch'])
            ->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc');

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($qb) use ($q) {
                $qb->where('patient_name', 'like', "%$q%")
                    ->orWhere('patient_phone', 'like', "%$q%")
                    ->orWhere('appointment_number', 'like', "%$q%")
                    ->orWhere('patient_email', 'like', "%$q%");
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('appointment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('appointment_date', '<=', $request->date_to);
        }

        $paginated = $query->paginate(100)->through(fn ($a) => [
            'id' => $a->id,
            'appointment_number' => $a->appointment_number,
            'patient_name' => $a->patient_name,
            'patient_phone' => $a->patient_phone,
            'patient_email' => $a->patient_email,
            'doctor_id' => $a->doctor_id,
            'doctor_name' => $a->doctor?->name,
            'doctor_spec' => $a->doctor?->specialization,
            'branch_id' => $a->branch_id,
            'branch_name' => $a->branch?->name,
            'service' => $a->service,
            'type' => $a->type,
            'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
            'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
            'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
            'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
            'status' => $a->status,
            'notes' => $a->notes,
            'admin_notes' => $a->admin_notes,
            'created_by' => $a->created_by,
            'confirmed_by' => $a->confirmed_by,
        ]);

        $aptRows = Appointment::whereNotNull('created_by')
            ->selectRaw('created_by, status, count(*) as cnt')
            ->groupBy('created_by', 'status')
            ->get()
            ->groupBy('created_by');

        $staffUsers = User::whereHas('role', fn ($q) => $q->whereIn('name', ['admin', 'receptionist']))
            ->where('is_active', true)
            ->with('role')
            ->orderBy('name')
            ->get();

        $creatorStats = $staffUsers->mapWithKeys(fn ($u) => [
            $u->name => [
                'role' => $u->role?->name === 'admin' ? 'Админ' : 'Ресепшн',
                'total' => $aptRows->has($u->name) ? $aptRows[$u->name]->sum('cnt') : 0,
                'pending' => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'pending')->sum('cnt') : 0,
                'confirmed' => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'confirmed')->sum('cnt') : 0,
                'completed' => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'completed')->sum('cnt') : 0,
                'cancelled' => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'cancelled')->sum('cnt') : 0,
            ],
        ]);

        $creators = $staffUsers->pluck('name')->sort()->values();

        return Inertia::render('admin/appointments/search', [
            'appointments' => $paginated,
            'creatorStats' => $creatorStats,
            'doctors' => Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'specialization']),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'creators' => $creators,
            'filters' => $request->only('q', 'status', 'type', 'doctor_id', 'branch_id', 'created_by', 'date_from', 'date_to'),
        ]);
    }

    /** Дахин захиалга — өмнөх мэдээллийг pre-fill хийж create хуудсанд илгээх */
    public function rebookForm(Appointment $appointment): Response
    {
        return Inertia::render('admin/appointments/create', [
            'doctors' => Doctor::where('is_active', true)->with('branches')->orderBy('name')->get()->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'specialization' => $d->specialization,
                'branch_id' => $d->branch_id,
                'branch_ids' => $d->branches->pluck('id')->toArray(),
            ]),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'prefill' => [
                'patient_name' => $appointment->patient_name,
                'patient_phone' => $appointment->patient_phone,
                'patient_email' => $appointment->patient_email,
                'doctor_id' => $appointment->doctor_id,
                'branch_id' => $appointment->branch_id,
                'service' => $appointment->service,
                'type' => $appointment->type,
                'notes' => $appointment->notes,
            ],
        ]);
    }

    /** Polling endpoint — шинэ pending захиалга шалгах */
    public function pendingPoll(Request $request): JsonResponse
    {
        $sinceId = (int) $request->get('since_id', 0);

        $newItems = Appointment::where('status', 'pending')
            ->where('type', 'in_person')
            ->where('id', '>', $sinceId)
            ->with(['doctor'])
            ->orderBy('id')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'patient_email' => $a->patient_email,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'doctor_name' => $a->doctor?->name,
                'type' => $a->type,
                'notes' => $a->notes,
            ])
            ->values()
            ->all();

        $latestId = Appointment::where('status', 'pending')->where('type', 'in_person')->orderByDesc('id')->value('id') ?? 0;

        return response()->json([
            'latest_id' => $latestId,
            'new_items' => $newItems,
        ]);
    }

    /** Inline status change — жагсаалтаас шууд */
    public function changeStatus(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate(['status' => 'required|in:pending,confirmed,cancelled,completed']);

        $allowed = [
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['cancelled', 'completed'],
            'cancelled' => [],
            'completed' => [],
        ];
        if (! in_array($request->status, $allowed[$appointment->status] ?? [])) {
            return back()->with('error', 'Энэ төлөв рүү шилжих боломжгүй.');
        }

        $updateData = ['status' => $request->status];
        if ($request->status === 'confirmed') {
            $updateData['confirmed_by'] = Auth::user()?->name ?? 'Админ';
            $updateData['confirmed_by_id'] = Auth::id();
        }

        $oldStatus = $appointment->status;
        $appointment->update($updateData);

        AuditService::log('status_changed', $appointment, ['status' => $oldStatus], ['status' => $request->status], "Захиалгын статус өөрчлөв: {$appointment->appointment_number} → {$request->status}");

        // Online захиалгад Meet линк + имэйлийг queue-д явуулна
        if ($request->status === 'confirmed' && $appointment->type === 'online' && empty($appointment->meet_link)) {
            GenerateMeetLink::dispatch($appointment->id);
        }

        $labels = [
            'confirmed' => 'Баталгаажлаа',
            'cancelled' => 'Цуцлагдлаа',
            'completed' => 'Дууслаа',
            'pending' => 'Хүлээгдэж байна',
        ];

        return back()->with('success', $appointment->appointment_number.' — '.$labels[$request->status]);
    }
}
