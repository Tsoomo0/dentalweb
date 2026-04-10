<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Doctor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('booking', [
            'doctors'  => Doctor::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'specialization', 'branch_id']),
            'branches' => Branch::where('is_active', true)
                ->orderBy('order')
                ->get(['id', 'name']),
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
            'appointment_time' => 'required',
            'notes'            => 'nullable|string|max:1000',
        ]);

        $appointment = Appointment::create([
            'appointment_number' => Appointment::generateNumber(),
            'patient_name'       => $request->patient_name,
            'patient_phone'      => $request->patient_phone,
            'patient_email'      => $request->patient_email,
            'doctor_id'          => $request->doctor_id,
            'branch_id'          => $request->branch_id,
            'service'            => $request->service,
            'type'               => $request->type,
            'appointment_date'   => $request->appointment_date,
            'appointment_time'   => $request->appointment_time,
            'status'             => 'pending',
            'notes'              => $request->notes,
        ]);

        return redirect()->back()->with('booking_success', $appointment->appointment_number);
    }
}
