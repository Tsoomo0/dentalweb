<?php

namespace App\Console\Commands;

use App\Jobs\SendAppointmentReminder;
use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';

    protected $description = 'Confirmed захиалгад 24h болон 2h өмнө сануулга илгээх';

    public function handle(): void
    {
        $now = Carbon::now();

        // 24 цагийн сануулга (23:30 — 24:30 хооронд байвал)
        $target24 = $now->copy()->addHours(24);
        $from24 = $target24->copy()->subMinutes(30);
        $to24 = $target24->copy()->addMinutes(30);

        $appointments24 = Appointment::with('doctor')
            ->where('status', 'confirmed')
            ->whereNotNull('patient_email')
            ->whereDate('appointment_date', $target24->toDateString())
            ->whereTime('appointment_time', '>=', $from24->format('H:i'))
            ->whereTime('appointment_time', '<', $to24->format('H:i'))
            ->get();

        foreach ($appointments24 as $apt) {
            SendAppointmentReminder::dispatch($apt->id, '24h');
            $this->info("24h reminder queued: {$apt->appointment_number}");
        }

        // 2 цагийн сануулга (1:30 — 2:30 хооронд байвал)
        $target2 = $now->copy()->addHours(2);
        $from2 = $target2->copy()->subMinutes(30);
        $to2 = $target2->copy()->addMinutes(30);

        $appointments2 = Appointment::with('doctor')
            ->where('status', 'confirmed')
            ->whereNotNull('patient_email')
            ->whereDate('appointment_date', $target2->toDateString())
            ->whereTime('appointment_time', '>=', $from2->format('H:i'))
            ->whereTime('appointment_time', '<', $to2->format('H:i'))
            ->get();

        foreach ($appointments2 as $apt) {
            SendAppointmentReminder::dispatch($apt->id, '2h');
            $this->info("2h reminder queued: {$apt->appointment_number}");
        }

        $total = $appointments24->count() + $appointments2->count();
        $this->info("Нийт {$total} сануулга queue-д нэмэгдлээ.");
    }
}
