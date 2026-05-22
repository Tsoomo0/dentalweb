<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Treatment;
use App\Models\User;
use App\Notifications\AppointmentBookedPatient;
use App\Notifications\AppointmentConfirmedPatient;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ReceptionAppointmentController extends Controller
{
    private function branchId(): ?int
    {
        return Auth::user()->branch_id;
    }

    public function index(Request $request): Response
    {
        $branchId = $this->branchId();

        $query = Appointment::with(['doctor', 'branch', 'treatmentRecord'])
            ->when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
            ->orderBy('appointment_date', 'desc')
            ->orderBy('appointment_time', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }
        if ($request->filled('date')) {
            $query->whereDate('appointment_date', $request->date);
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
            'patient_last_name' => $a->patient_last_name,
            'patient_first_name' => $a->patient_first_name,
            'display_name' => $a->display_name,
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
            'treatment_sent' => $a->treatmentRecord && in_array($a->treatmentRecord->payment_status, ['sent', 'partial', 'leasing', 'paid']),
        ]);

        $today = now()->toDateString();

        $base = fn () => Appointment::when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
            $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
        }));

        $creators = $base()->whereNotNull('created_by')
            ->distinct()
            ->pluck('created_by')
            ->sort()
            ->values();

        return Inertia::render('reception/appointments/index', [
            'appointments' => $appointments,
            'doctors' => Doctor::where('is_active', true)
                ->when($branchId, fn ($q) => $q->whereHas('branches', fn ($q2) => $q2->where('branches.id', $branchId)))
                ->with('branches')
                ->orderBy('name')
                ->get()
                ->map(fn ($d) => [
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
            'filters' => $request->only('status', 'doctor_id', 'date'),
            'stats' => [
                'total' => $base()->count(),
                'pending' => $base()->where('status', 'pending')->count(),
                'confirmed' => $base()->where('status', 'confirmed')->count(),
                'today' => $base()->whereDate('appointment_date', $today)->count(),
                'cancelled' => $base()->where('status', 'cancelled')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $branchId = $this->branchId();

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
            'appointment_date' => 'required|date',
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

        $patientId = $request->patient_id;
        $lastName = trim((string) $request->patient_last_name);
        $firstName = trim((string) $request->patient_first_name);
        // Fallback: зөвхөн patient_name ирвэл түүнийг хувааж first/last name болгох
        if (! $firstName && ! $lastName && $request->patient_name) {
            $parts = preg_split('/\s+/', trim($request->patient_name), 2);
            $lastName  = $parts[0] ?? '';
            $firstName = $parts[1] ?? $parts[0] ?? '';
        }
        if (! $firstName) {
            return back()->withErrors(['patient_first_name' => 'Үйлчлүүлэгчийн нэр оруулна уу.'])->withInput();
        }
        $patientName = trim($lastName.' '.$firstName);

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
            'created_by' => Auth::user()->name,
            'created_by_id' => Auth::id(),
            'branch_id' => $branchId ?? $request->branch_id,
            'patient_id' => $patientId,
            'patient_name' => $patientName,
            'patient_last_name' => $lastName,
            'patient_first_name' => $firstName,
            ...$request->only(
                'patient_phone', 'patient_email',
                'doctor_id', 'service', 'type',
                'appointment_date', 'appointment_time', 'appointment_time_end',
                'status', 'notes', 'admin_notes'
            ),
        ]);

        AuditService::log('created', $appointment, null, ['patient_name' => $appointment->patient_name, 'appointment_number' => $appointment->appointment_number], "Ресепшн цаг захиалга үүсгэв: {$appointment->appointment_number}");

        // Patient-д notification + email
        $appointment->load('doctor', 'branch');
        $this->notifyPatient($appointment, 'booked');

        return back()->with('success', 'Цаг захиалга амжилттай нэмэгдлээ.');
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        if ($this->branchId() && $appointment->branch_id !== null && $appointment->branch_id !== $this->branchId()) {
            return back()->with('error', 'Зөвшөөрөл байхгүй.');
        }

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

        $oldStatus = $appointment->status;
        $lastName = trim((string) $request->patient_last_name);
        $firstName = trim((string) $request->patient_first_name);
        // Fallback: зөвхөн patient_name ирвэл түүнийг хувааж first/last name болгох
        if (! $firstName && ! $lastName && $request->patient_name) {
            $parts = preg_split('/\s+/', trim($request->patient_name), 2);
            $lastName  = $parts[0] ?? '';
            $firstName = $parts[1] ?? $parts[0] ?? '';
        }
        if (! $firstName) {
            return back()->withErrors(['patient_first_name' => 'Үйлчлүүлэгчийн нэр оруулна уу.'])->withInput();
        }
        $patientName = trim($lastName.' '.$firstName);

        $patientId = $request->filled('patient_id') ? (int) $request->patient_id : $appointment->patient_id;
        if (! $patientId) {
            $phone = $request->patient_phone ?: $appointment->patient_phone ?? '';
            $patient = Patient::firstOrCreate(
                ['phone' => $phone],
                [
                    'patient_number' => Patient::generateNumber(),
                    'last_name' => $lastName,
                    'first_name' => $firstName,
                    'email' => $request->patient_email ?: $appointment->patient_email,
                    'created_by' => Auth::id(),
                ]
            );
            $patientId = $patient->id;
        }

        $appointment->update(array_merge($request->only(
            'patient_phone', 'patient_email',
            'doctor_id', 'branch_id', 'service', 'type',
            'appointment_date', 'appointment_time', 'appointment_time_end',
            'status', 'notes', 'admin_notes'
        ), [
            'patient_id' => $patientId,
            'patient_name' => $patientName,
            'patient_last_name' => $lastName,
            'patient_first_name' => $firstName,
        ]));

        // Статус confirmed болоход patient-д notification явуулна
        if ($oldStatus !== 'confirmed' && $appointment->status === 'confirmed') {
            $appointment->load('doctor', 'branch');
            $this->notifyPatient($appointment, 'confirmed');
        }

        AuditService::log('updated', $appointment, null, ['patient_name' => $appointment->patient_name, 'status' => $appointment->status], "Ресепшн захиалга шинэчлэв: {$appointment->appointment_number}");

        return back()->with('success', 'Захиалга шинэчлэгдлээ.');
    }

    public function changeStatus(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate(['status' => 'required|in:pending,confirmed,cancelled,completed']);

        if ($this->branchId() && $appointment->branch_id !== null && $appointment->branch_id !== $this->branchId()) {
            return back()->with('error', 'Зөвшөөрөл байхгүй.');
        }

        $allowed = [
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['cancelled', 'completed'],
            'cancelled' => [],
            'completed' => [],
        ];
        if (! in_array($request->status, $allowed[$appointment->status] ?? [])) {
            return back()->with('error', 'Энэ төлөв рүү шилжих боломжгүй.');
        }

        $oldStatus = $appointment->status;

        $updateData = ['status' => $request->status];
        if ($request->status === 'confirmed') {
            $updateData['confirmed_by'] = Auth::user()->name;
            $updateData['confirmed_by_id'] = Auth::id();

            if (! $appointment->patient_id) {
                $nameParts = explode(' ', trim($appointment->patient_name ?? ''), 2);
                $patient = Patient::firstOrCreate(
                    ['phone' => $appointment->patient_phone ?? ''],
                    [
                        'patient_number' => Patient::generateNumber(),
                        'last_name' => $nameParts[0] ?? '',
                        'first_name' => $nameParts[1] ?? '',
                        'email' => $appointment->patient_email,
                        'created_by' => Auth::id(),
                    ]
                );
                $updateData['patient_id'] = $patient->id;
            }
        }

        $appointment->update($updateData);

        // Цаг баталгаажихад patient-д notification явуулна
        if ($request->status === 'confirmed') {
            $appointment->load('doctor', 'branch');
            $this->notifyPatient($appointment, 'confirmed');
        }

        $labels = [
            'confirmed' => 'Баталгаажлаа',
            'cancelled' => 'Цуцлагдлаа',
            'completed' => 'Дууслаа',
            'pending' => 'Хүлээгдэж байна',
        ];

        AuditService::log('status_changed', $appointment, ['status' => $oldStatus], ['status' => $request->status], "Ресепшн захиалгын төлөв өөрчлөв: {$appointment->appointment_number} → {$request->status}");

        return back()->with('success', $appointment->appointment_number.' — '.$labels[$request->status]);
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
        if ($this->branchId() && $appointment->branch_id !== null && $appointment->branch_id !== $this->branchId()) {
            return back()->with('error', 'Зөвшөөрөл байхгүй.');
        }

        AuditService::log('deleted', $appointment, ['patient_name' => $appointment->patient_name, 'appointment_number' => $appointment->appointment_number], null, "Ресепшн захиалга устгав: {$appointment->appointment_number}");
        $appointment->delete();

        return back()->with('success', 'Цаг захиалга устгагдлаа.');
    }

    public function search(Request $request): Response
    {
        $branchId = $this->branchId();

        $query = Appointment::with(['doctor', 'branch'])
            ->when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
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
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('appointment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('appointment_date', '<=', $request->date_to);
        }

        $appointments = $query->get()->map(fn ($a) => [
            'id' => $a->id,
            'appointment_number' => $a->appointment_number,
            'patient_name' => $a->patient_name,
            'patient_last_name' => $a->patient_last_name,
            'patient_first_name' => $a->patient_first_name,
            'display_name' => $a->display_name,
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
            ->when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
            ->selectRaw('created_by, status, count(*) as cnt')
            ->groupBy('created_by', 'status')
            ->get()
            ->groupBy('created_by');

        $staffUsers = User::whereHas('role', fn ($q) => $q->whereIn('name', ['admin', 'receptionist']))
            ->where('is_active', true)
            ->when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
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

        return Inertia::render('reception/appointments/search', [
            'appointments' => $appointments,
            'creatorStats' => $creatorStats,
            'doctors' => Doctor::where('is_active', true)
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->orderBy('name')->get(['id', 'name', 'specialization']),
            'creators' => $creators,
            'filters' => $request->only('q', 'status', 'type', 'doctor_id', 'created_by', 'date_from', 'date_to'),
        ]);
    }

    public function pendingPoll(Request $request): JsonResponse
    {
        $branchId = $this->branchId();
        $sinceId = (int) $request->get('since_id', 0);

        $newItems = Appointment::where('status', 'pending')
            ->where('type', 'in_person')
            ->where('id', '>', $sinceId)
            ->when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
            ->with(['doctor'])
            ->orderBy('id')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_name' => $a->patient_name,
                'display_name' => $a->display_name,
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

        $latestId = Appointment::where('status', 'pending')
            ->where('type', 'in_person')
            ->when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
            ->orderByDesc('id')
            ->value('id') ?? 0;

        return response()->json([
            'latest_id' => $latestId,
            'new_items' => $newItems,
        ]);
    }

    public function statusPoll(Request $request): JsonResponse
    {
        $branchId = $this->branchId();
        $since = $request->integer('since', 0);
        $sinceAt = $since > 0 ? now()->setTimestamp($since) : now()->subMinutes(1);

        $updated = Appointment::with(['doctor', 'branch', 'treatmentRecord'])
            ->where('updated_at', '>', $sinceAt)
            ->when($branchId, fn ($q) => $q->where(function ($q2) use ($branchId) {
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_id' => $a->patient_id,
                'patient_name' => $a->patient_name,
                'patient_last_name' => $a->patient_last_name,
                'patient_first_name' => $a->patient_first_name,
                'display_name' => $a->display_name,
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
                'treatment_sent' => $a->treatmentRecord && in_array($a->treatmentRecord->payment_status, ['sent', 'partial', 'leasing', 'paid']),
            ]);

        return response()->json([
            'updated' => $updated,
            'server_time' => now()->timestamp,
        ]);
    }

    private function notifyPatient(Appointment $appointment, string $event): void
    {
        if (! $appointment->patient_email) {
            return;
        }

        // email-аар patient хэрэглэгч хайна
        $patientUser = User::where('email', $appointment->patient_email)
            ->whereHas('role', fn ($q) => $q->where('name', 'patient'))
            ->first();

        // patient_id-аар хайна (email тохирохгүй байвал)
        if (! $patientUser && $appointment->patient_id) {
            $patientUser = Patient::find($appointment->patient_id)?->user;
        }

        if (! $patientUser) {
            return;
        }

        $date = $appointment->appointment_date?->format('Y-m-d') ?? '';
        $time = $appointment->appointment_time ? substr($appointment->appointment_time, 0, 5) : '';

        if ($event === 'confirmed') {
            $patientUser->notify(new AppointmentConfirmedPatient(
                appointmentNumber: $appointment->appointment_number,
                appointmentDate: $date,
                appointmentTime: $time,
                doctorName: $appointment->doctor?->name,
                branchName: $appointment->branch?->name,
            ));
        } else {
            $patientUser->notify(new AppointmentBookedPatient(
                appointmentNumber: $appointment->appointment_number,
                appointmentDate: $date,
                appointmentTime: $time,
                doctorName: $appointment->doctor?->name,
                branchName: $appointment->branch?->name,
                status: $appointment->status,
            ));
        }
    }
}
