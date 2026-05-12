<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\NewAppointment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PatientOnlineConsultationController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();
        $fee   = (int) Setting::get('online_consultation_fee', 50000);

        $doctors = Doctor::where('has_online_booking', true)
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function ($doctor) use ($today) {
                $slots = collect($doctor->online_slots ?? [])
                    ->filter(fn($s) => !($s['is_booked'] ?? false) && ($s['date'] ?? '') >= $today)
                    ->sortBy('date')
                    ->values()
                    ->toArray();

                return [
                    'id'              => $doctor->id,
                    'name'            => $doctor->name,
                    'specialization'  => $doctor->specialization,
                    'photo_url'       => $doctor->photo ? Storage::url($doctor->photo) : null,
                    'available_slots' => $slots,
                ];
            })
            ->filter(fn($d) => count($d['available_slots']) > 0)
            ->values();

        return Inertia::render('patient/online-consultation', [
            'doctors' => $doctors,
            'fee'     => $fee,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (Setting::get('booking_enabled', '1') !== '1') {
            return back()->with('error', 'Онлайн цаг захиалга түр хаагдсан байна.');
        }

        $advanceDays = (int) Setting::get('appointment_advance_days', 30);

        $validated = $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'slot_id'   => 'required|string',
            'notes'     => 'nullable|string|max:1000',
        ]);

        $doctor = Doctor::find($validated['doctor_id']);
        $slots  = $doctor->online_slots ?? [];

        $slotIdx = null;
        $slot    = null;
        foreach ($slots as $i => $s) {
            if ($s['id'] === $validated['slot_id']) {
                $slotIdx = $i;
                $slot    = $s;
                break;
            }
        }

        if ($slot === null) {
            return back()->with('error', 'Цаг олдсонгүй.');
        }

        if ($slot['is_booked'] ?? false) {
            return back()->with('error', 'Энэ цаг аль хэдийн захиалагдсан байна.');
        }

        $slotDate = \Carbon\Carbon::parse($slot['date']);
        if ($slotDate->isBefore(today()) || $slotDate->isAfter(today()->addDays($advanceDays))) {
            return back()->with('error', 'Цагийн хугацаа хүчингүй байна.');
        }

        // Patient info from authenticated portal user
        $user    = Auth::user();
        $patient = $user->patient;

        $patientName  = $patient
            ? trim($patient->last_name . ' ' . $patient->first_name)
            : $user->name;
        $patientPhone = $patient?->phone ?? '';
        $patientEmail = $patient?->email ?? $user->email ?? '';
        $patientId    = $patient?->id;

        // Mark slot as booked
        $slots[$slotIdx]['is_booked'] = true;
        $doctor->update(['online_slots' => $slots]);

        $appointment = Appointment::create([
            'appointment_number'   => Appointment::generateNumber(),
            'patient_name'         => $patientName,
            'patient_phone'        => $patientPhone,
            'patient_email'        => $patientEmail,
            'patient_id'           => $patientId,
            'doctor_id'            => $doctor->id,
            'branch_id'            => $doctor->branch_id,
            'service'              => 'Онлайн зөвлөгөө',
            'type'                 => 'online',
            'online_slot_id'       => $validated['slot_id'],
            'appointment_date'     => $slot['date'],
            'appointment_time'     => $slot['start_time'],
            'appointment_time_end' => $slot['end_time'] ?? null,
            'status'               => 'pending',
            'payment_status'       => 'pending',
            'payment_amount'       => (int) Setting::get('online_consultation_fee', 50000),
            'notes'                => $validated['notes'] ?? null,
        ]);

        $appointment->load('branch');
        $this->notifyStaff($appointment, $doctor->name);

        return redirect()->route('payment.show', $appointment->id)
            ->with('success', 'Цаг амжилттай захиалагдлаа! Та доорх товчийг дарж төлбөрөө төлнө үү.');
    }

    private function notifyStaff(Appointment $appointment, ?string $doctorName): void
    {
        $notif = new NewAppointment(
            appointmentNumber: $appointment->appointment_number,
            patientName:       $appointment->patient_name,
            patientPhone:      $appointment->patient_phone,
            appointmentType:   $appointment->type,
            appointmentDate:   $appointment->appointment_date?->toDateString(),
            appointmentTime:   $appointment->appointment_time,
            doctorName:        $doctorName,
            branchName:        $appointment->branch?->name,
        );

        $receptionists = User::whereHas('role', fn($q) => $q->where('name', 'receptionist'))
            ->when($appointment->branch_id, fn($q) => $q->where('branch_id', $appointment->branch_id))
            ->get();

        $admins = User::whereHas('role', fn($q) => $q->where('name', 'admin'))->get();

        $recipients = $admins->merge($receptionists)->unique('id');

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, $notif);
        }
    }
}
