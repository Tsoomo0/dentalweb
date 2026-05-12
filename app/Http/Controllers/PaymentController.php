<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateMeetLink;
use App\Jobs\SendAppointmentEmails;
use App\Models\Appointment;
use App\Services\GoogleMeetService;
use App\Services\QPayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        private readonly QPayService       $qpay,
        private readonly GoogleMeetService $meet
    ) {}

    // ─── Төлбөрийн хуудас харуулах ───────────────────────────────────────────

    public function show(Appointment $appointment): Response
    {
        // Аль хэдийн төлсөн бол баталгаажлалын хуудас руу шилжүүлэх
        if ($appointment->payment_status === 'paid') {
            return Inertia::render('payment', [
                'appointment' => $this->appointmentData($appointment),
                'already_paid' => true,
            ]);
        }

        return Inertia::render('payment', [
            'appointment' => $this->appointmentData($appointment),
            'already_paid' => false,
            'test_mode'    => (bool) config('services.qpay.test_mode', false),
        ]);
    }

    // ─── QPay invoice үүсгэх ─────────────────────────────────────────────────

    public function createInvoice(Request $request, Appointment $appointment): JsonResponse
    {
        if ($appointment->payment_status === 'paid') {
            return response()->json(['paid' => true, 'meet_link' => $appointment->meet_link]);
        }

        // ── Тест горим: QPay-г тойрч шууд баталгаажуулна ──────────────────
        if (config('services.qpay.test_mode', false)) {
            $this->confirmPayment($appointment);
            return response()->json(['paid' => true, 'meet_link' => $appointment->meet_link]);
        }

        try {
            // Хуучин invoice байвал шалгах
            if ($appointment->qpay_invoice_id) {
                $paid = $this->qpay->checkPayment($appointment->qpay_invoice_id);
                if ($paid) {
                    $this->confirmPayment($appointment);
                    return response()->json(['paid' => true, 'meet_link' => $appointment->meet_link]);
                }
            }

            $invoice = $this->qpay->createInvoice($appointment);

            $appointment->update(['qpay_invoice_id' => $invoice['invoice_id']]);

            return response()->json([
                'paid'          => false,
                'invoice_id'    => $invoice['invoice_id'],
                'qr_image'      => $invoice['qr_image']      ?? null,
                'qr_text'       => $invoice['qr_text']       ?? null,
                'qpay_deeplink' => $invoice['qpay_deeplink'] ?? [],
            ]);
        } catch (\Throwable $e) {
            Log::error('QPay createInvoice failed', ['appointment' => $appointment->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'QPay холбогдоход алдаа гарлаа: ' . $e->getMessage()], 500);
        }
    }

    // ─── Төлбөр хийгдсэн эсэхийг шалгах (frontend polling) ──────────────────

    public function checkStatus(Appointment $appointment): JsonResponse
    {
        if ($appointment->payment_status === 'paid') {
            return response()->json(['paid' => true, 'meet_link' => $appointment->meet_link]);
        }

        if (!$appointment->qpay_invoice_id) {
            return response()->json(['paid' => false, 'error' => 'Invoice олдсонгүй']);
        }

        $paid = $this->qpay->checkPayment($appointment->qpay_invoice_id);

        if ($paid) {
            $this->confirmPayment($appointment);
            return response()->json(['paid' => true, 'meet_link' => $appointment->meet_link]);
        }

        return response()->json(['paid' => false]);
    }

    // ─── QPay callback (QPay сервер дуудна) ──────────────────────────────────

    public function callback(Request $request, int $appointmentId): JsonResponse
    {
        $appointment = Appointment::find($appointmentId);

        if (!$appointment || $appointment->payment_status === 'paid') {
            return response()->json(['status' => 'ok']);
        }

        if (!$appointment->qpay_invoice_id) {
            return response()->json(['status' => 'ok']);
        }

        try {
            $paid = $this->qpay->checkPayment($appointment->qpay_invoice_id);
            if ($paid) {
                $this->confirmPayment($appointment);
            }
        } catch (\Throwable $e) {
            Log::error('QPay callback error', ['appointment' => $appointmentId, 'error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'ok']);
    }

    // ─── Private: Захиалга баталгаажуулах + Meet линк + Мэйл ────────────────

    private function confirmPayment(Appointment $appointment): void
    {
        if ($appointment->payment_status === 'paid') {
            return; // давхардлаас сэргийлэх
        }

        $appointment->update([
            'payment_status' => 'paid',
            'status'         => 'confirmed',
        ]);

        // Meet link болон имэйлийг дараалсан queue job-аар гүйцэтгэнэ
        GenerateMeetLink::dispatch($appointment->id);
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private function appointmentData(Appointment $appointment): array
    {
        return [
            'id'                   => $appointment->id,
            'appointment_number'   => $appointment->appointment_number,
            'patient_name'         => $appointment->patient_name,
            'patient_email'        => $appointment->patient_email,
            'doctor_name'          => $appointment->doctor?->name,
            'appointment_date'     => $appointment->appointment_date?->format('Y.m.d') ?? '—',
            'appointment_time'     => $appointment->appointment_time,
            'appointment_time_end' => $appointment->appointment_time_end,
            'payment_status'       => $appointment->payment_status,
            'payment_amount'       => $appointment->payment_amount,
            'meet_link'            => $appointment->meet_link,
        ];
    }
}
