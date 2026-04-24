<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DoctorOnlineSlotController extends Controller
{
    public function index(): Response
    {
        $doctor = Auth::guard('doctor')->user();

        if (!$doctor->has_online_booking) {
            return Inertia::render('doctor/online-slots', [
                'slots'     => [],
                'hasAccess' => false,
            ]);
        }

        $slots = $doctor->online_slots ?? [];

        // Booked slot-уудад appointment мэдээлэл холбох
        $bookedSlotIds = collect($slots)
            ->filter(fn($s) => $s['is_booked'] ?? false)
            ->pluck('id');

        $appointments = Appointment::whereIn('online_slot_id', $bookedSlotIds)
            ->get()
            ->keyBy('online_slot_id');

        $slots = array_map(function ($slot) use ($appointments) {
            if (($slot['is_booked'] ?? false) && isset($appointments[$slot['id']])) {
                $apt = $appointments[$slot['id']];
                $slot['appointment'] = [
                    'id'                   => $apt->id,
                    'appointment_number'   => $apt->appointment_number,
                    'patient_name'         => $apt->patient_name,
                    'patient_phone'        => $apt->patient_phone,
                    'patient_email'        => $apt->patient_email,
                    'notes'                => $apt->notes,
                    'meet_link'            => $apt->meet_link,
                    'status'               => $apt->status,
                    'payment_status'       => $apt->payment_status,
                ];
            }
            return $slot;
        }, $slots);

        return Inertia::render('doctor/online-slots', [
            'slots'     => $slots,
            'hasAccess' => true,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $doctor = Auth::guard('doctor')->user();
        if (!$doctor->has_online_booking) {
            return back()->with('error', 'Танд онлайн цаг удирдах эрх байхгүй байна.');
        }

        $request->validate([
            'date'       => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i|after:start_time',
        ]);

        $doctor = Auth::guard('doctor')->user();
        $slots  = $doctor->online_slots ?? [];

        $slots[] = [
            'id'         => (string) Str::uuid(),
            'date'       => $request->date,
            'start_time' => $request->start_time,
            'end_time'   => $request->end_time,
            'is_booked'  => false,
        ];

        // Огноо, цагаар эрэмбэлэх
        usort($slots, fn($a, $b) => strcmp($a['date'].$a['start_time'], $b['date'].$b['start_time']));

        $doctor->update(['online_slots' => $slots]);

        return back()->with('success', 'Онлайн цаг нэмэгдлээ.');
    }

    public function destroy(Request $request, string $slotId): RedirectResponse
    {
        $doctor = Auth::guard('doctor')->user();
        if (!$doctor->has_online_booking) {
            return back()->with('error', 'Танд онлайн цаг удирдах эрх байхгүй байна.');
        }

        $slots  = collect($doctor->online_slots ?? [])
            ->filter(fn($s) => $s['id'] !== $slotId)
            ->values()
            ->toArray();

        $doctor->update(['online_slots' => $slots]);

        return back()->with('success', 'Цаг устгагдлаа.');
    }
}
