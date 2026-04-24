<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\Doctor;
use Illuminate\Console\Command;

class CancelUnpaidAppointments extends Command
{
    protected $signature   = 'appointments:cancel-unpaid';
    protected $description = '10 минутын дотор төлбөр төлөгдөөгүй онлайн захиалгуудыг устгах';

    public function handle(): void
    {
        $expiredAppointments = Appointment::where('type', 'online')
            ->where('payment_status', 'pending')
            ->where('status', 'pending')
            ->where('created_at', '<=', now()->subMinutes(10))
            ->get();

        if ($expiredAppointments->isEmpty()) {
            $this->info('Устгах захиалга байхгүй байна.');
            return;
        }

        foreach ($expiredAppointments as $appointment) {
            // Doctor-ийн slot-ийг чөлөөлөх
            if ($appointment->online_slot_id && $appointment->doctor_id) {
                $doctor = Doctor::find($appointment->doctor_id);
                if ($doctor) {
                    $slots = collect($doctor->online_slots ?? [])
                        ->map(function ($s) use ($appointment) {
                            if ($s['id'] === $appointment->online_slot_id) {
                                $s['is_booked'] = false;
                            }
                            return $s;
                        })
                        ->toArray();
                    $doctor->update(['online_slots' => $slots]);
                }
            }

            $this->line("Устгагдлаа: {$appointment->appointment_number}");
            $appointment->delete();
        }

        $this->info("Нийт {$expiredAppointments->count()} захиалга устгагдлаа.");
    }
}
