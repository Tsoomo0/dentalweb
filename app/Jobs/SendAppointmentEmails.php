<?php

namespace App\Jobs;

use App\Mail\AppointmentConfirmed;
use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAppointmentEmails implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public readonly Appointment $appointment) {}

    public function handle(): void
    {
        $appointment = $this->appointment->fresh(['doctor']);

        if ($appointment->patient_email) {
            try {
                Mail::to($appointment->patient_email)
                    ->send(new AppointmentConfirmed($appointment, 'patient'));
            } catch (\Throwable $e) {
                Log::error('Patient email failed', ['appointment' => $appointment->id, 'error' => $e->getMessage()]);
            }
        }

        $doctorEmail = $appointment->doctor?->email;
        if ($doctorEmail) {
            try {
                Mail::to($doctorEmail)
                    ->send(new AppointmentConfirmed($appointment, 'doctor'));
            } catch (\Throwable $e) {
                Log::error('Doctor email failed', ['appointment' => $appointment->id, 'error' => $e->getMessage()]);
            }
        }
    }
}
