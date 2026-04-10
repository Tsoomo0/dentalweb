<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Treatment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $appointments = $query->get()->map(fn($a) => [
            'id'                 => $a->id,
            'appointment_number' => $a->appointment_number,
            'patient_name'       => $a->patient_name,
            'patient_phone'      => $a->patient_phone,
            'patient_email'      => $a->patient_email,
            'doctor_id'          => $a->doctor_id,
            'doctor_name'        => $a->doctor?->name,
            'doctor_spec'        => $a->doctor?->specialization,
            'branch_name'        => $a->branch?->name,
            'service'            => $a->service,
            'type'               => $a->type,
            'appointment_date'   => $a->appointment_date->format('Y-m-d'),
            'appointment_time'     => $a->appointment_time,
            'appointment_time_end' => $a->appointment_time_end,
            'formatted_date'       => $a->appointment_date->format('Y.m.d'),
            'status'             => $a->status,
            'notes'              => $a->notes,
            'admin_notes'        => $a->admin_notes,
        ]);

        $today = now()->toDateString();

        return Inertia::render('admin/appointments/index', [
            'appointments' => $appointments,
            'doctors'      => Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'specialization', 'branch_id']),
            'branches'     => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
            'treatments'   => Treatment::where('is_active', true)->orderBy('order')->get(['id', 'title']),
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
            'doctors'  => Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'specialization', 'branch_id']),
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
        $appointment->formatted_date = $appointment->appointment_date->format('Y.m.d');

        return Inertia::render('admin/appointments/show', [
            'appointment' => array_merge($appointment->toArray(), [
                'doctor_name'    => $appointment->doctor?->name,
                'doctor_spec'    => $appointment->doctor?->specialization,
                'branch_name'    => $appointment->branch?->name,
                'formatted_date' => $appointment->appointment_date->format('Y.m.d'),
            ]),
            'doctors'  => Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'specialization', 'branch_id']),
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate([
            'patient_name'     => 'required|string|max:255',
            'patient_phone'    => 'required|string|max:50',
            'patient_email'    => 'nullable|email|max:255',
            'doctor_id'        => 'nullable|exists:doctors,id',
            'branch_id'        => 'nullable|exists:branches,id',
            'service'          => 'nullable|string|max:255',
            'type'             => 'required|in:online,in_person',
            'appointment_date' => 'required|date',
            'appointment_time'     => 'required',
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

        return redirect()->route('admin.appointments.index')->with('success', 'Цаг захиалга шинэчлэгдлээ.');
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
        $appointment->delete();
        return back()->with('success', 'Цаг захиалга устгагдлаа.');
    }

    /** Polling endpoint — шинэ pending захиалга шалгах */
    public function pendingPoll(Request $request): JsonResponse
    {
        $sinceId = (int) $request->get('since_id', 0);

        $newItems = Appointment::where('status', 'pending')
            ->where('id', '>', $sinceId)
            ->with(['doctor'])
            ->orderBy('id')
            ->get()
            ->map(fn($a) => [
                'id'                 => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_name'       => $a->patient_name,
                'patient_phone'      => $a->patient_phone,
                'appointment_date'   => $a->appointment_date->format('Y-m-d'),
                'appointment_time'   => $a->appointment_time,
                'doctor_name'        => $a->doctor?->name,
                'type'               => $a->type,
            ])
            ->values()
            ->all();

        $latestId = Appointment::where('status', 'pending')->orderByDesc('id')->value('id') ?? 0;

        return response()->json([
            'latest_id' => $latestId,
            'new_items' => $newItems,
        ]);
    }

    /** Inline status change — жагсаалтаас шууд */
    public function changeStatus(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate(['status' => 'required|in:pending,confirmed,cancelled,completed']);
        $appointment->update(['status' => $request->status]);

        $labels = [
            'confirmed' => 'Баталгаажлаа',
            'cancelled'  => 'Цуцлагдлаа',
            'completed'  => 'Дууслаа',
            'pending'    => 'Хүлээгдэж байна',
        ];

        return back()->with('success', $appointment->appointment_number . ' — ' . $labels[$request->status]);
    }
}
