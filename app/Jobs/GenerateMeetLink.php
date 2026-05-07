<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Models\Setting;
use App\Services\GoogleMeetService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateMeetLink implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public readonly int $appointmentId) {}

    public function handle(GoogleMeetService $meet): void
    {
        $appointment = Appointment::find($this->appointmentId);

        if (! $appointment || $appointment->meet_link) {
            return;
        }

        if (Setting::get('google_meet_auto', '1') !== '1') {
            return;
        }

        try {
            $link = $meet->createMeetLink();
            if ($link) {
                $appointment->update(['meet_link' => $link]);
                // Имэйлийг meet link үүссэний дараа дахин илгээх
                SendAppointmentEmails::dispatch($appointment);
            }
        } catch (\Throwable $e) {
            Log::error('GenerateMeetLink failed', ['appointment' => $this->appointmentId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }
}
