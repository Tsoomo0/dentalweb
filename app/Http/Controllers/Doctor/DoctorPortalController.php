<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DoctorPortalController extends Controller
{
    public function dashboard(): Response
    {
        $doctor = Auth::guard('doctor')->user();
        $today = now()->toDateString();

        $todayAppointments = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $today)
            ->with('treatmentRecord')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_id' => $a->patient_id,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'service' => $a->service,
                'type' => $a->type,
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
                'status' => $a->status,
                'treatment_sent' => $a->treatmentRecord && in_array($a->treatmentRecord->payment_status, ['sent', 'partial', 'leasing', 'paid']),
            ]);

        $pendingAppointments = Appointment::where('doctor_id', $doctor->id)
            ->where('status', 'pending')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->limit(8)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'service' => $a->service,
                'type' => $a->type,
            ]);

        // Сүүлийн 7 хоногийн захиалгын тоо (бар чарт)
        $dayNames = ['Ням', 'Да', 'Мя', 'Лх', 'Пу', 'Ба', 'Бя'];
        $weeklyData = collect(range(6, 0))->map(function ($daysAgo) use ($doctor, $dayNames) {
            $date = now()->subDays($daysAgo)->toDateString();
            $dow = (int) now()->subDays($daysAgo)->format('w'); // 0=Sun

            return [
                'date' => $date,
                'day' => $dayNames[$dow],
                'count' => Appointment::where('doctor_id', $doctor->id)
                    ->whereDate('appointment_date', $date)
                    ->whereIn('status', ['confirmed', 'completed'])
                    ->count(),
            ];
        })->values()->all();

        // Захиалгын статусын тоймлол
        $statusBreakdown = [
            'confirmed' => Appointment::where('doctor_id', $doctor->id)->where('status', 'confirmed')->count(),
            'completed' => Appointment::where('doctor_id', $doctor->id)->where('status', 'completed')->count(),
            'pending' => Appointment::where('doctor_id', $doctor->id)->where('status', 'pending')->count(),
            'cancelled' => Appointment::where('doctor_id', $doctor->id)->where('status', 'cancelled')->count(),
        ];

        // Энэ сарын өдрийн трэнд (line chart)
        $monthlyData = Appointment::where('doctor_id', $doctor->id)
            ->whereYear('appointment_date', now()->year)
            ->whereMonth('appointment_date', now()->month)
            ->whereDate('appointment_date', '<=', $today)
            ->selectRaw('DATE(appointment_date) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => (string) $r->date,
                'day' => (int) substr($r->date, 8, 2),
                'count' => (int) $r->count,
            ])->values()->all();

        // Захиалгын төрлийн харьцаа
        $typeStats = [
            'online' => Appointment::where('doctor_id', $doctor->id)->where('type', 'online')->count(),
            'in_person' => Appointment::where('doctor_id', $doctor->id)->where('type', 'in_person')->count(),
        ];

        return Inertia::render('doctor/dashboard', [
            'stats' => [
                'today' => $todayAppointments->count(),
                'upcoming' => Appointment::where('doctor_id', $doctor->id)->where('status', 'confirmed')->whereDate('appointment_date', '>=', $today)->count(),
                'pending' => Appointment::where('doctor_id', $doctor->id)->where('status', 'pending')->count(),
                'total' => Appointment::where('doctor_id', $doctor->id)->count(),
            ],
            'today_appointments' => $todayAppointments,
            'pending_appointments' => $pendingAppointments,
            'weekly_data' => $weeklyData,
            'status_breakdown' => $statusBreakdown,
            'monthly_data' => $monthlyData,
            'type_stats' => $typeStats,
        ]);
    }

    public function calendar(): Response
    {
        $doctor = Auth::guard('doctor')->user();
        $today = now()->toDateString();

        $appointments = Appointment::where('doctor_id', $doctor->id)
            ->where('status', 'confirmed')
            ->with(['branch', 'treatmentRecord'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_id' => $a->patient_id,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'patient_email' => $a->patient_email,
                'service' => $a->service,
                'type' => $a->type,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
                'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
                'status' => $a->status,
                'payment_status' => $a->payment_status,
                'notes' => $a->notes,
                'branch_name' => $a->branch?->name,
                'treatment_sent' => $a->treatmentRecord && in_array($a->treatmentRecord->payment_status, ['sent', 'partial', 'leasing', 'paid']),
            ]);

        $seniors = $doctor->seniorDoctors()->get();
        $seniorIds = $seniors->pluck('id');

        $seniorAppointmentMap = Appointment::whereIn('doctor_id', $seniorIds)
            ->where('status', 'confirmed')
            ->with('branch')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->groupBy('doctor_id');

        $seniorDoctors = $seniors->map(fn ($senior) => [
            'id' => $senior->id,
            'name' => $senior->name,
            'appointments' => ($seniorAppointmentMap[$senior->id] ?? collect())->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_id' => $a->patient_id,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'patient_email' => $a->patient_email,
                'service' => $a->service,
                'type' => $a->type,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
                'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
                'status' => $a->status,
                'payment_status' => $a->payment_status,
                'notes' => $a->notes,
                'branch_name' => $a->branch?->name,
            ])->values()->all(),
        ]);

        return Inertia::render('doctor/calendar', [
            'doctor' => array_merge($doctor->only([
                'id', 'name', 'specialization', 'degree', 'experience_years',
                'experiences', 'description', 'phone', 'email', 'is_active',
            ]), [
                'photo_url' => $doctor->photo ? Storage::url($doctor->photo) : null,
                'branch_name' => $doctor->branch?->name,
                'online_slots' => $doctor->online_slots ?? [],
            ]),
            'appointments' => $appointments,
            'senior_doctors' => $seniorDoctors,
            'stats' => [
                'today' => Appointment::where('doctor_id', $doctor->id)->whereDate('appointment_date', $today)->count(),
                'upcoming' => Appointment::where('doctor_id', $doctor->id)->where('status', 'confirmed')->whereDate('appointment_date', '>=', $today)->count(),
                'pending' => Appointment::where('doctor_id', $doctor->id)->where('status', 'pending')->count(),
                'total' => Appointment::where('doctor_id', $doctor->id)->count(),
            ],
        ]);
    }

    public function calendarPoll(): JsonResponse
    {
        $doctor = Auth::guard('doctor')->user();

        $appointments = Appointment::where('doctor_id', $doctor->id)
            ->where('status', 'confirmed')
            ->with(['branch', 'treatmentRecord'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_id' => $a->patient_id,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'patient_email' => $a->patient_email,
                'service' => $a->service,
                'type' => $a->type,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
                'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
                'status' => $a->status,
                'payment_status' => $a->payment_status,
                'notes' => $a->notes,
                'branch_name' => $a->branch?->name,
                'treatment_sent' => $a->treatmentRecord && in_array($a->treatmentRecord->payment_status, ['sent', 'partial', 'leasing', 'paid']),
            ]);

        $seniors = $doctor->seniorDoctors()->get();
        $seniorIds = $seniors->pluck('id');
        $seniorAppointmentMap = Appointment::whereIn('doctor_id', $seniorIds)
            ->where('status', 'confirmed')
            ->with('branch')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->groupBy('doctor_id');

        $seniorDoctors = $seniors->map(fn ($senior) => [
            'id' => $senior->id,
            'name' => $senior->name,
            'appointments' => ($seniorAppointmentMap[$senior->id] ?? collect())->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_id' => $a->patient_id,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'patient_email' => $a->patient_email,
                'service' => $a->service,
                'type' => $a->type,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
                'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
                'status' => $a->status,
                'payment_status' => $a->payment_status,
                'notes' => $a->notes,
                'branch_name' => $a->branch?->name,
            ])->values()->all(),
        ]);

        return response()->json([
            'appointments' => $appointments,
            'senior_doctors' => $seniorDoctors,
        ]);
    }

    public function seniorCalendar(Doctor $senior): Response
    {
        $doctor = Auth::guard('doctor')->user();

        if (! $doctor->seniorDoctors()->where('doctors.id', $senior->id)->exists()) {
            return redirect()->route('doctor.calendar');
        }

        $today = now()->toDateString();

        $appointments = Appointment::where('doctor_id', $senior->id)
            ->where('status', 'confirmed')
            ->with('branch')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'patient_name' => $a->patient_name,
                'patient_phone' => $a->patient_phone,
                'patient_email' => $a->patient_email,
                'service' => $a->service,
                'type' => $a->type,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
                'formatted_date' => $a->appointment_date?->format('Y.m.d') ?? '—',
                'status' => $a->status,
                'notes' => $a->notes,
                'branch_name' => $a->branch?->name,
            ]);

        return Inertia::render('doctor/senior-calendar', [
            'senior' => [
                'id' => $senior->id,
                'name' => $senior->name,
                'specialization' => $senior->specialization,
                'photo_url' => $senior->photo ? Storage::url($senior->photo) : null,
                'branch_name' => $senior->branch?->name,
            ],
            'appointments' => $appointments,
            'stats' => [
                'today' => Appointment::where('doctor_id', $senior->id)->whereDate('appointment_date', $today)->count(),
                'upcoming' => Appointment::where('doctor_id', $senior->id)->where('status', 'confirmed')->whereDate('appointment_date', '>=', $today)->count(),
                'total' => Appointment::where('doctor_id', $senior->id)->count(),
            ],
        ]);
    }
}
