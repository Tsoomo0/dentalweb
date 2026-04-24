<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DoctorSlotController extends Controller
{
    /**
     * Эмчийн онлайн цагуудыг харах
     */
    public function index(Doctor $doctor): Response
    {
        return Inertia::render('admin/doctors/slots', [
            'doctor' => [
                'id'             => $doctor->id,
                'name'           => $doctor->name,
                'specialization' => $doctor->specialization,
                'email'          => $doctor->email,
                'photo_url'      => $doctor->photo
                    ? \Illuminate\Support\Facades\Storage::url($doctor->photo)
                    : null,
            ],
            'slots' => collect($doctor->online_slots ?? [])
                ->sortBy(fn($s) => $s['date'] . $s['start_time'])
                ->values()
                ->toArray(),
        ]);
    }

    /**
     * Шинэ цаг нэмэх
     */
    public function store(Request $request, Doctor $doctor): RedirectResponse
    {
        $request->validate([
            'date'       => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i|after:start_time',
        ], [
            'date.required'       => 'Огноо оруулна уу.',
            'start_time.required' => 'Эхлэх цаг оруулна уу.',
            'end_time.required'   => 'Дуусах цаг оруулна уу.',
            'end_time.after'      => 'Дуусах цаг эхлэх цагаас хойш байх ёстой.',
        ]);

        $slots   = $doctor->online_slots ?? [];
        $slots[] = [
            'id'         => (string) Str::uuid(),
            'date'       => $request->date,
            'start_time' => $request->start_time,
            'end_time'   => $request->end_time,
            'is_booked'  => false,
        ];

        usort($slots, fn($a, $b) => strcmp($a['date'] . $a['start_time'], $b['date'] . $b['start_time']));

        $doctor->update(['online_slots' => $slots]);

        return back()->with('success', 'Цаг амжилттай нэмэгдлээ.');
    }

    /**
     * Цаг засах
     */
    public function update(Request $request, Doctor $doctor, string $slotId): RedirectResponse
    {
        $request->validate([
            'date'       => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i|after:start_time',
        ], [
            'end_time.after' => 'Дуусах цаг эхлэх цагаас хойш байх ёстой.',
        ]);

        $slots   = $doctor->online_slots ?? [];
        $found   = false;

        foreach ($slots as &$slot) {
            if ($slot['id'] !== $slotId) {
                continue;
            }
            if ($slot['is_booked'] ?? false) {
                return back()->withErrors(['error' => 'Захиалгатай цагийг засах боломжгүй.']);
            }
            $slot['date']       = $request->date;
            $slot['start_time'] = $request->start_time;
            $slot['end_time']   = $request->end_time;
            $found = true;
            break;
        }
        unset($slot);

        if (!$found) {
            return back()->withErrors(['error' => 'Цаг олдсонгүй.']);
        }

        usort($slots, fn($a, $b) => strcmp($a['date'] . $a['start_time'], $b['date'] . $b['start_time']));

        $doctor->update(['online_slots' => $slots]);

        return back()->with('success', 'Цаг амжилттай засагдлаа.');
    }

    /**
     * Цаг устгах
     */
    public function destroy(Doctor $doctor, string $slotId): RedirectResponse
    {
        $slots = $doctor->online_slots ?? [];
        $slot  = collect($slots)->firstWhere('id', $slotId);

        if (!$slot) {
            return back()->withErrors(['error' => 'Цаг олдсонгүй.']);
        }

        if ($slot['is_booked'] ?? false) {
            return back()->withErrors(['error' => 'Захиалгатай цагийг устгах боломжгүй.']);
        }

        $slots = array_values(array_filter($slots, fn($s) => $s['id'] !== $slotId));

        $doctor->update(['online_slots' => $slots]);

        return back()->with('success', 'Цаг амжилттай устгагдлаа.');
    }
}
