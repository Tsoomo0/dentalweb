<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\AppointmentConfirmed;
use App\Models\Appointment;
use App\Services\GoogleMeetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class PaymentAdminController extends Controller
{
    public function __construct(private readonly GoogleMeetService $meet) {}

    // ─── Төлбөрийн жагсаалт + статистик ────────────────────────────────────

    public function index(Request $request): Response
    {
        $query = Appointment::with('doctor')->where('type', 'online');

        // Filter
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q
                ->where('patient_name', 'like', "%{$s}%")
                ->orWhere('patient_email', 'like', "%{$s}%")
                ->orWhere('appointment_number', 'like', "%{$s}%")
            );
        }
        if ($request->filled('date_from')) {
            $query->whereDate('appointment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('appointment_date', '<=', $request->date_to);
        }

        $payments = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        // Stats
        $allOnline = Appointment::where('type', 'online');
        $stats = [
            'total_revenue'  => (clone $allOnline)->where('payment_status', 'paid')->sum('payment_amount'),
            'paid_count'     => (clone $allOnline)->where('payment_status', 'paid')->count(),
            'pending_count'  => (clone $allOnline)->where('payment_status', 'pending')->count(),
            'failed_count'   => (clone $allOnline)->whereIn('payment_status', ['failed', 'cancelled'])->count(),
            'with_meet_link' => (clone $allOnline)->where('payment_status', 'paid')->whereNotNull('meet_link')->count(),
            'today_revenue'  => (clone $allOnline)->where('payment_status', 'paid')
                ->whereDate('updated_at', today())->sum('payment_amount'),
        ];

        return Inertia::render('admin/payments/index', [
            'payments' => $payments->through(fn($a) => $this->mapPayment($a)),
            'stats'    => $stats,
            'filters'  => $request->only(['payment_status', 'search', 'date_from', 'date_to']),
        ]);
    }

    // ─── Гар аргаар төлбөр баталгаажуулах ──────────────────────────────────

    public function confirm(Appointment $appointment): RedirectResponse
    {
        if ($appointment->payment_status === 'paid') {
            return back()->with('info', 'Аль хэдийн төлөгдсөн байна.');
        }

        $meetLink = $this->meet->generateMeetLink();

        $appointment->update([
            'payment_status' => 'paid',
            'status'         => 'confirmed',
            'meet_link'      => $meetLink,
        ]);

        $this->sendEmails($appointment);

        return back()->with('success', "#{$appointment->appointment_number} — Төлбөр баталгаажлаа. Meet линк үүсч имэйл явуулсан.");
    }

    // ─── Meet линк дахин үүсгэх ─────────────────────────────────────────────

    public function regenerateMeet(Appointment $appointment): RedirectResponse
    {
        if ($appointment->payment_status !== 'paid') {
            return back()->with('error', 'Зөвхөн төлөгдсөн захиалгад Meet линк үүсгэнэ.');
        }

        $meetLink = $this->meet->generateMeetLink();
        $appointment->update(['meet_link' => $meetLink]);

        $this->sendEmails($appointment);

        return back()->with('success', "Meet линк шинэчлэгдлээ. Имэйл дахин явуулсан.");
    }

    // ─── Нэг төлбөрийн дэлгэрэнгүй (JSON) ─────────────────────────────────

    public function show(Appointment $appointment): JsonResponse
    {
        return response()->json($this->mapPayment($appointment->load('doctor')));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private function mapPayment(Appointment $a): array
    {
        return [
            'id'                   => $a->id,
            'appointment_number'   => $a->appointment_number,
            'patient_name'         => $a->patient_name,
            'patient_phone'        => $a->patient_phone,
            'patient_email'        => $a->patient_email,
            'doctor_name'          => $a->doctor?->name,
            'appointment_date'     => $a->appointment_date->format('Y.m.d'),
            'appointment_time'     => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
            'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
            'payment_status'       => $a->payment_status ?? 'pending',
            'payment_amount'       => $a->payment_amount ?? 0,
            'qpay_invoice_id'      => $a->qpay_invoice_id,
            'meet_link'            => $a->meet_link,
            'status'               => $a->status,
            'created_at'           => $a->created_at?->format('Y.m.d H:i'),
        ];
    }

    private function sendEmails(Appointment $appointment): void
    {
        if ($appointment->patient_email) {
            try {
                Mail::to($appointment->patient_email)->send(new AppointmentConfirmed($appointment, 'patient'));
            } catch (\Throwable $e) {
                Log::error('Admin confirm patient email failed', ['id' => $appointment->id, 'error' => $e->getMessage()]);
            }
        }

        $doctorEmail = $appointment->doctor?->email;
        if ($doctorEmail) {
            try {
                Mail::to($doctorEmail)->send(new AppointmentConfirmed($appointment, 'doctor'));
            } catch (\Throwable $e) {
                Log::error('Admin confirm doctor email failed', ['id' => $appointment->id, 'error' => $e->getMessage()]);
            }
        }
    }
}
