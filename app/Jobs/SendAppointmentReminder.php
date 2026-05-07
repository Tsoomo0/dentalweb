<?php

namespace App\Jobs;

use App\Mail\AppointmentReminder;
use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAppointmentReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        public readonly int    $appointmentId,
        public readonly string $type  // '24h' | '2h'
    ) {}

    public function handle(): void
    {
        $appointment = Appointment::with('doctor')->find($this->appointmentId);

        if (! $appointment || ! $appointment->patient_email) {
            return;
        }

        // Устгагдсан эсвэл cancelled захиалгад илгээхгүй
        if (in_array($appointment->status, ['cancelled', 'completed'])) {
            return;
        }

        try {
            Mail::to($appointment->patient_email)
                ->send(new AppointmentReminder($appointment, $this->type));
        } catch (\Throwable $e) {
            Log::error('Appointment reminder email failed', [
                'appointment' => $this->appointmentId,
                'type'        => $this->type,
                'error'       => $e->getMessage(),
            ]);
        }
    }
}
