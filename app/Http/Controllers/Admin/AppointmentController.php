<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Treatment;
use App\Services\GoogleMeetService;
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

        if ($request->filled('status'))     $query->where('status', $request->status);
        if ($request->filled('doctor_id'))  $query->where('doctor_id', $request->doctor_id);
        if ($request->filled('branch_id'))  $query->where('branch_id', $request->branch_id);
        if ($request->filled('date'))       $query->whereDate('appointment_date', $request->date);
        if ($request->filled('type'))       $query->where('type', $request->type);

        if ($request->filled('month')) {
            $query->whereYear('appointment_date', substr($request->month, 0, 4))
                  ->whereMonth('appointment_date', substr($request->month, 5, 2));
        } elseif (!$request->filled('date') && !$request->filled('status')) {
            $query->whereBetween('appointment_date', [
                now()->subMonth()->startOfMonth()->toDateString(),
                now()->addMonths(2)->endOfMonth()->toDateString(),
            ]);
        }

        $appointments = $query->get()->map(fn($a) => [
            'id'                 => $a->id,
            'appointment_number' => $a->appointment_number,
            'patient_name'       => $a->patient_name,
            'patient_phone'      => $a->patient_phone,
            'patient_email'      => $a->patient_email,
            'doctor_id'          => $a->doctor_id,
            'doctor_name'        => $a->doctor?->name,
            'doctor_spec'        => $a->doctor?->specialization,
            'branch_id'          => $a->branch_id,
            'branch_name'        => $a->branch?->name,
            'service'            => $a->service,
            'type'               => $a->type,
            'appointment_date'   => $a->appointment_date?->format('Y-m-d') ?? '',
            'appointment_time'     => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
            'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
            'formatted_date'       => $a->appointment_date?->format('Y.m.d') ?? '—',
            'status'             => $a->status,
            'payment_status'     => $a->payment_status,
            'notes'              => $a->notes,
            'admin_notes'        => $a->admin_notes,
            'created_by'         => $a->created_by,
            'confirmed_by'       => $a->confirmed_by,
        ]);

        $today = now()->toDateString();

        $creators = Appointment::whereNotNull('created_by')
            ->distinct()
            ->pluck('created_by')
            ->sort()
            ->values();

        return Inertia::render('admin/appointments/index', [
            'appointments' => $appointments,
            'doctors'      => Doctor::where('is_active', true)->with('branches')->orderBy('name')->get()->map(fn($d) => [
                'id'             => $d->id,
                'name'           => $d->name,
                'specialization' => $d->specialization,
                'branch_id'      => $d->branch_id,
                'branch_ids'     => $d->branches->pluck('id')->toArray(),
                'photo_url'      => $d->photo ? Storage::url($d->photo) : null,
            ]),
            'branches'     => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'treatments'   => Treatment::where('is_active', true)->orderBy('order')->get(['id', 'title']),
            'creators'     => $creators,
            'filters'      => $request->only('status', 'doctor_id', 'branch_id', 'date', 'type'),
            'stats'        => [
                'total'     => Appointment::count(),
                'pending'   => Appointment::where('status', 'pending')->count(),
                'confirmed' => Appointment::where('status', 'confirmed')->count(),
                'today'     => Appointment::whereDate('appointment_date', $today)->count(),
                'cancelled' => Appointment::where('status', 'cancelled')->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/appointments/create', [
            'doctors'  => Doctor::where('is_active', true)->with('branches')->orderBy('name')->get()->map(fn($d) => [
                'id'             => $d->id,
                'name'           => $d->name,
                'specialization' => $d->specialization,
                'branch_id'      => $d->branch_id,
                'branch_ids'     => $d->branches->pluck('id')->toArray(),
            ]),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'patient_name'     => 'required|string|max:255',
            'patient_phone'    => 'required|string|max:50',
            'patient_email'    => 'nullable|email|max:255',
            'doctor_id'        => 'nullable|exists:doctors,id',
            'branch_id'        => 'nullable|exists:branches,id',
            'service'          => 'nullable|string|max:255',
            'type'             => 'required|in:online,in_person',
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time'     => 'required',
            'appointment_time_end' => 'nullable|date_format:H:i',
            'status'               => 'required|in:pending,confirmed,cancelled,completed',
            'notes'                => 'nullable|string',
            'admin_notes'          => 'nullable|string',
        ]);

        Appointment::create([
            'appointment_number' => Appointment::generateNumber(),
            'created_by'         => Auth::user()?->name ?? 'Админ',
            ...$request->only(
                'patient_name', 'patient_phone', 'patient_email',
                'doctor_id', 'branch_id', 'service', 'type',
                'appointment_date', 'appointment_time', 'appointment_time_end',
                'status', 'notes', 'admin_notes'
            ),
        ]);

        return redirect()->route('admin.appointments.index')->with('success', 'Цаг захиалга амжилттай нэмэгдлээ.');
    }

    public function show(Appointment $appointment): Response
    {
        $appointment->load(['doctor.branch', 'branch']);

        return Inertia::render('admin/appointments/show', [
            'appointment' => array_merge($appointment->toArray(), [
                'doctor_name'    => $appointment->doctor?->name,
                'doctor_spec'    => $appointment->doctor?->specialization,
                'branch_name'    => $appointment->branch?->name,
                'formatted_date' => $appointment->appointment_date?->format('Y.m.d') ?? '—',
            ]),
            'doctors'  => Doctor::where('is_active', true)->with('branches')->orderBy('name')->get()->map(fn($d) => [
                'id'             => $d->id,
                'name'           => $d->name,
                'specialization' => $d->specialization,
                'branch_id'      => $d->branch_id,
                'branch_ids'     => $d->branches->pluck('id')->toArray(),
            ]),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate([
            'patient_name'         => 'required|string|max:255',
            'patient_phone'        => 'required|string|max:50',
            'patient_email'        => 'nullable|email|max:255',
            'doctor_id'            => 'nullable|exists:doctors,id',
            'branch_id'            => 'nullable|exists:branches,id',
            'service'              => 'nullable|string|max:255',
            'type'                 => 'required|in:online,in_person',
            'appointment_date'     => 'nullable|date',
            'appointment_time'     => 'nullable',
            'appointment_time_end' => 'nullable|date_format:H:i',
            'status'               => 'required|in:pending,confirmed,cancelled,completed',
            'notes'                => 'nullable|string',
            'admin_notes'          => 'nullable|string',
        ]);

        $appointment->update($request->only(
            'patient_name', 'patient_phone', 'patient_email',
            'doctor_id', 'branch_id', 'service', 'type',
            'appointment_date', 'appointment_time', 'appointment_time_end',
            'status', 'notes', 'admin_notes'
        ));

        return back()->with('success', 'Захиалга шинэчлэгдлээ.');
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
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
        if ($request->filled('status'))     $query->where('status', $request->status);
        if ($request->filled('type'))       $query->where('type', $request->type);
        if ($request->filled('doctor_id'))  $query->where('doctor_id', $request->doctor_id);
        if ($request->filled('branch_id'))  $query->where('branch_id', $request->branch_id);
        if ($request->filled('created_by')) $query->where('created_by', $request->created_by);
        if ($request->filled('date_from'))  $query->whereDate('appointment_date', '>=', $request->date_from);
        if ($request->filled('date_to'))    $query->whereDate('appointment_date', '<=', $request->date_to);

        $appointments = $query->get()->map(fn($a) => [
            'id'                   => $a->id,
            'appointment_number'   => $a->appointment_number,
            'patient_name'         => $a->patient_name,
            'patient_phone'        => $a->patient_phone,
            'patient_email'        => $a->patient_email,
            'doctor_id'            => $a->doctor_id,
            'doctor_name'          => $a->doctor?->name,
            'doctor_spec'          => $a->doctor?->specialization,
            'branch_id'            => $a->branch_id,
            'branch_name'          => $a->branch?->name,
            'service'              => $a->service,
            'type'                 => $a->type,
            'appointment_date'     => $a->appointment_date?->format('Y-m-d') ?? '',
            'appointment_time'     => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
            'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
            'formatted_date'       => $a->appointment_date?->format('Y.m.d') ?? '—',
            'status'               => $a->status,
            'notes'                => $a->notes,
            'admin_notes'          => $a->admin_notes,
            'created_by'           => $a->created_by,
            'confirmed_by'         => $a->confirmed_by,
        ]);

        $aptRows = \App\Models\Appointment::whereNotNull('created_by')
            ->selectRaw('created_by, status, count(*) as cnt')
            ->groupBy('created_by', 'status')
            ->get()
            ->groupBy('created_by');

        $staffUsers = \App\Models\User::whereHas('role', fn($q) => $q->whereIn('name', ['admin', 'receptionist']))
            ->where('is_active', true)
            ->with('role')
            ->orderBy('name')
            ->get();

        $creatorStats = $staffUsers->mapWithKeys(fn($u) => [
            $u->name => [
                'role'      => $u->role?->name === 'admin' ? 'Админ' : 'Ресепшн',
                'total'     => $aptRows->has($u->name) ? $aptRows[$u->name]->sum('cnt') : 0,
                'pending'   => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'pending')->sum('cnt') : 0,
                'confirmed' => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'confirmed')->sum('cnt') : 0,
                'completed' => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'completed')->sum('cnt') : 0,
                'cancelled' => $aptRows->has($u->name) ? $aptRows[$u->name]->where('status', 'cancelled')->sum('cnt') : 0,
            ]
        ]);

        $creators = $staffUsers->pluck('name')->sort()->values();

        return Inertia::render('admin/appointments/search', [
            'appointments' => $appointments,
            'creatorStats' => $creatorStats,
            'doctors'      => Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'specialization']),
            'branches'     => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'creators'     => $creators,
            'filters'      => $request->only('q', 'status', 'type', 'doctor_id', 'branch_id', 'created_by', 'date_from', 'date_to'),
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
            ->map(fn($a) => [
                'id'                 => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_name'       => $a->patient_name,
                'patient_phone'      => $a->patient_phone,
                'patient_email'      => $a->patient_email,
                'appointment_date'   => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time'   => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'doctor_name'        => $a->doctor?->name,
                'type'               => $a->type,
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

        $updateData = ['status' => $request->status];
        if ($request->status === 'confirmed') {
            $updateData['confirmed_by'] = Auth::user()?->name ?? 'Админ';

            // Online захиалгад Meet линк үүсгэх
            if ($appointment->type === 'online' && empty($appointment->meet_link)) {
                $meetService = new GoogleMeetService();
                $link = $meetService->createMeetLink();
                if ($link) {
                    $updateData['meet_link'] = $link;
                }
            }
        }

        $appointment->update($updateData);

        $labels = [
            'confirmed' => 'Баталгаажлаа',
            'cancelled'  => 'Цуцлагдлаа',
            'completed'  => 'Дууслаа',
            'pending'    => 'Хүлээгдэж байна',
        ];

        return back()->with('success', $appointment->appointment_number . ' — ' . $labels[$request->status]);
    }
}
