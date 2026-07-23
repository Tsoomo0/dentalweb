<?php

namespace App\Console\Commands;

use App\Jobs\GenerateMeetLink;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Services\QPayService;
use Illuminate\Console\Command;

class CancelUnpaidAppointments extends Command
{
    protected $signature = 'appointments:cancel-unpaid';

    protected $description = '5 минутын дотор төлбөр төлөгдөөгүй онлайн захиалгуудыг цуцлах';

    public function handle(QPayService $qpay): void
    {
        $expiredAppointments = Appointment::where('type', 'online')
            ->where('payment_status', 'pending')
            ->where('status', 'pending')
            ->where('created_at', '<=', now()->subMinutes(5))
            ->get();

        if ($expiredAppointments->isEmpty()) {
            $this->info('Цуцлах захиалга байхгүй байна.');

            return;
        }

        foreach ($expiredAppointments as $appointment) {
            // Устгахаас (slot чөлөөлөхөөс) өмнө QPay-с сүүлчийн удаа шалгана —
            // банкны шилжүүлэг 5 минутаас удаан бол мөнгө орсон ч цаг цуцлагдахаас сэргийлнэ
            if ($appointment->qpay_invoice_id && $qpay->checkPayment($appointment->qpay_invoice_id)) {
                $appointment->update(['payment_status' => 'paid', 'status' => 'confirmed']);
                GenerateMeetLink::dispatch($appointment->id);
                $this->line("Төлөгдсөн эсэхийг илрүүлж баталгаажууллаа: {$appointment->appointment_number}");

                continue;
            }

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

            // Бичлэгийг устгахгүй, зөвхөн цуцлагдсан гэж тэмдэглэнэ — мөнгөний
            // маргаан гарвал admin/doctor портал дээр ул мөр харагдаж байх ёстой
            $appointment->update(['status' => 'cancelled', 'payment_status' => 'expired']);
            $this->line("Цуцлагдлаа: {$appointment->appointment_number}");
        }

        $this->info("Нийт {$expiredAppointments->count()} захиалга шалгагдлаа.");
    }
}
