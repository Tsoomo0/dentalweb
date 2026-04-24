<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DoctorPortalController extends Controller
{
    public function dashboard(): Response
    {
        $doctor = Auth::guard('doctor')->user();
        $today  = now()->toDateString();

        $todayAppointments = Appointment::where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $today)
            ->orderBy('appointment_time')
            ->get()
            ->map(fn($a) => [
                'id'                   => $a->id,
                'appointment_number'   => $a->appointment_number,
                'patient_name'         => $a->patient_name,
                'patient_phone'        => $a->patient_phone,
                'service'              => $a->service,
                'type'                 => $a->type,
                'appointment_time'     => $a->appointment_time ?? '',
                'appointment_time_end' => $a->appointment_time_end,
                'status'               => $a->status,
            ]);

        $pendingAppointments = Appointment::where('doctor_id', $doctor->id)
            ->where('status', 'pending')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->limit(8)
            ->get()
            ->map(fn($a) => [
                'id'                   => $a->id,
                'appointment_number'   => $a->appointment_number,
                'patient_name'         => $a->patient_name,
                'patient_phone'        => $a->patient_phone,
                'appointment_date'     => $a->appointment_date?->format('Y-m-d') ?? '',
                'formatted_date'       => $a->appointment_date?->format('Y.m.d') ?? '—',
                'appointment_time'     => $a->appointment_time ?? '',
                'service'              => $a->service,
                'type'                 => $a->type,
            ]);

        return Inertia::render('doctor/dashboard', [
            'stats' => [
                'today'    => $todayAppointments->count(),
                'upcoming' => Appointment::where('doctor_id', $doctor->id)->where('status', 'confirmed')->whereDate('appointment_date', '>=', $today)->count(),
                'pending'  => Appointment::where('doctor_id', $doctor->id)->where('status', 'pending')->count(),
                'total'    => Appointment::where('doctor_id', $doctor->id)->count(),
            ],
            'today_appointments'   => $todayAppointments,
            'pending_appointments' => $pendingAppointments,
        ]);
    }

    public function calendar(): Response
    {
        $doctor = Auth::guard('doctor')->user();
        $today  = now()->toDateString();

        $appointments = Appointment::where('doctor_id', $doctor->id)
            ->where('status', 'confirmed')
            ->where(fn($q) => $q->whereNull('payment_status')->orWhere('payment_status', 'paid'))
            ->with('branch')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get()
            ->map(fn($a) => [
                'id'                   => $a->id,
                'appointment_number'   => $a->appointment_number,
                'patient_name'         => $a->patient_name,
                'patient_phone'        => $a->patient_phone,
                'patient_email'        => $a->patient_email,
                'service'              => $a->service,
                'type'                 => $a->type,
                'appointment_date'     => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time'     => $a->appointment_time ?? '',
                'appointment_time_end' => $a->appointment_time_end,
                'formatted_date'       => $a->appointment_date?->format('Y.m.d') ?? '—',
                'status'               => $a->status,
                'payment_status'       => $a->payment_status,
                'notes'                => $a->notes,
                'branch_name'          => $a->branch?->name,
            ]);

        return Inertia::render('doctor/calendar', [
            'doctor' => array_merge($doctor->only([
                'id', 'name', 'specialization', 'degree', 'experience_years',
                'experiences', 'description', 'phone', 'email', 'is_active',
            ]), [
                'photo_url'    => $doctor->photo ? Storage::url($doctor->photo) : null,
                'branch_name'  => $doctor->branch?->name,
                'online_slots' => $doctor->online_slots ?? [],
            ]),
            'appointments' => $appointments,
            'stats' => [
                'today'    => Appointment::where('doctor_id', $doctor->id)->whereDate('appointment_date', $today)->count(),
                'upcoming' => Appointment::where('doctor_id', $doctor->id)->where('status', 'confirmed')->whereDate('appointment_date', '>=', $today)->count(),
                'pending'  => Appointment::where('doctor_id', $doctor->id)->where('status', 'pending')->count(),
                'total'    => Appointment::where('doctor_id', $doctor->id)->count(),
            ],
        ]);
    }
}
