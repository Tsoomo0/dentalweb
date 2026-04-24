<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use App\Models\Setting;
use App\Models\Treatment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();

        return Inertia::render('booking', [
            'consultation_fee' => (int) Setting::get('online_consultation_fee', 50000),
            'branches' => Branch::where('is_active', true)
                ->orderBy('order')
                ->get(['id', 'name', 'address', 'phone']),
            'doctors' => Doctor::where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn($d) => [
                    'id'             => $d->id,
                    'name'           => $d->name,
                    'specialization' => $d->specialization,
                    'branch_id'      => $d->branch_id,
                    'photo_url'      => $d->photo ? \Illuminate\Support\Facades\Storage::url($d->photo) : null,
                    'online_slots'   => collect($d->online_slots ?? [])
                        ->filter(fn($s) => !($s['is_booked'] ?? false) && $s['date'] >= $today)
                        ->values()
                        ->toArray(),
                ]),
            'treatments' => Treatment::where('is_active', true)
                ->orderBy('order')
                ->get(['id', 'title']),
        ]);
    }

    public function patientLookup(Request $request): JsonResponse
    {
        $phone = trim($request->get('phone', ''));
        if (strlen($phone) < 6) {
            return response()->json([]);
        }

        $apt = Appointment::where('patient_phone', $phone)
            ->whereNotNull('patient_name')
            ->orderByDesc('created_at')
            ->first(['patient_name', 'patient_email']);

        if (!$apt) {
            return response()->json([]);
        }

        return response()->json([
            'name'  => $apt->patient_name,
            'email' => $apt->patient_email ?? '',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // Honeypot — бот илрүүлэх
        if ($request->filled('_hp')) {
            return $this->fakeSuccess($request);
        }

        if ($request->booking_type === 'in_person') {
            return $this->storeInPerson($request);
        }

        return $this->storeOnline($request);
    }

    private function fakeSuccess(Request $request): RedirectResponse
    {
        if ($request->booking_type === 'in_person') {
            return redirect()->route('booking')->with('inperson_success', true);
        }
        return redirect()->route('booking')->with('booking_success', 'BOT-' . rand(1000, 9999));
    }

    private function storeOnline(Request $request): RedirectResponse
    {
        if (Setting::get('booking_enabled', '1') !== '1') {
            return redirect()->route('booking')->with('error', 'Онлайн цаг захиалга түр хаагдсан байна.');
        }

        $advanceDays = (int) Setting::get('appointment_advance_days', 30);

        $request->validate([
            'patient_name'         => 'required|string|max:255',
            'patient_phone'        => 'required|string|max:50',
            'patient_email'        => 'required|email|max:255',
            'doctor_id'            => 'required|exists:doctors,id',
            'online_slot_id'       => 'required|string',
            'appointment_date'     => 'required|date|after_or_equal:today|before_or_equal:' . now()->addDays($advanceDays)->toDateString(),
            'appointment_time'     => 'required',
            'appointment_time_end' => 'nullable|date_format:H:i',
            'notes'                => 'nullable|string|max:1000',
        ], [
            'patient_email.required'        => 'Google Meet линк илгээхийн тулд и-мэйл хаяг заавал шаардлагатай.',
            'patient_email.email'           => 'Зөв и-мэйл хаяг оруулна уу.',
            'appointment_date.before_or_equal' => "Цаг захиалга {$advanceDays} хоногоос хэтрэхгүй байх ёстой.",
        ]);

        // Slot-ийг хаалттай болгох
        $doctor = Doctor::find($request->doctor_id);
        if ($doctor) {
            $slots = collect($doctor->online_slots ?? [])
                ->map(function ($s) use ($request) {
                    if ($s['id'] === $request->online_slot_id) {
                        $s['is_booked'] = true;
                    }
                    return $s;
                })
                ->toArray();
            $doctor->update(['online_slots' => $slots]);
        }

        $appointment = Appointment::create([
            'appointment_number'   => Appointment::generateNumber(),
            'patient_name'         => $request->patient_name,
            'patient_phone'        => $request->patient_phone,
            'patient_email'        => $request->patient_email,
            'doctor_id'            => $request->doctor_id,
            'branch_id'            => $request->branch_id ?: $doctor?->branch_id,
            'service'              => 'Онлайн зөвлөгөө',
            'type'                 => 'online',
            'online_slot_id'       => $request->online_slot_id,
            'appointment_date'     => $request->appointment_date,
            'appointment_time'     => $request->appointment_time,
            'appointment_time_end' => $request->appointment_time_end,
            'status'               => 'pending',
            'payment_status'       => 'pending',
            'payment_amount'       => (int) Setting::get('online_consultation_fee', 50000),
            'notes'                => $request->notes,
        ]);

        session()->flash('success', 'Цаг амжилттай захиалагдлаа! Та доорх товчийг дарж төлбөрөө төлнө үү.');
        return redirect()->route('payment.show', $appointment->id);
    }

    private function storeInPerson(Request $request): RedirectResponse
    {
        $request->validate([
            'patient_name'  => 'required|string|max:255',
            'patient_phone' => 'required|string|max:50',
            'patient_email' => 'nullable|email|max:255',
            'service'       => 'nullable|string|max:255',
        ]);

        $notes = collect([
            $request->patient_address ? 'Хаяг: ' . $request->patient_address : null,
            $request->reason          ? 'Шалтгаан: ' . $request->reason       : null,
            $request->preferred_date
                ? 'Хүссэн цаг: ' . $request->preferred_date . ($request->preferred_time ? ' ' . $request->preferred_time : '')
                : null,
        ])->filter()->implode("\n");

        Appointment::create([
            'appointment_number'   => Appointment::generateNumber(),
            'patient_name'         => $request->patient_name,
            'patient_phone'        => $request->patient_phone,
            'patient_email'        => $request->patient_email,
            'branch_id'            => $request->branch_id ?: null,
            'service'              => $request->service ?: 'Биечлэн үзлэг',
            'type'                 => 'in_person',
            'appointment_date'     => $request->preferred_date ?: null,
            'appointment_time'     => $request->preferred_time ?: null,
            'status'               => 'pending',
            'payment_status'       => 'free',
            'notes'                => $notes ?: null,
        ]);

        return redirect()->route('booking')->with('inperson_success', true);
    }
}
