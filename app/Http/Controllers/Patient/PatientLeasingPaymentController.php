<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\LeasingPlan;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Notifications\LeasingPaidByPatient;
use App\Services\QPayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PatientLeasingPaymentController extends Controller
{
    public function __construct(private readonly QPayService $qpay) {}

    /* ── Invoice үүсгэх ─────────────────────────────────────── */

    public function createInvoice(LeasingPlan $plan): JsonResponse
    {
        $patient = Auth::user()->patient;
        if (!$patient || $plan->patient_id !== $patient->id) {
            abort(403);
        }

        $plan->refresh();

        // Дараагийн төлөгдөөгүй хуваарь
        $unpaid = $plan->installments()
            ->whereNull('paid_at')
            ->orderBy('installment_number')
            ->first();

        if (!$unpaid) {
            return response()->json(['paid' => true]);
        }

        // Хуучин invoice байвал шалгах
        if ($plan->qpay_invoice_id) {
            try {
                $paid = $this->qpay->checkPayment($plan->qpay_invoice_id);
                if ($paid) {
                    $this->processPayment($plan);
                    return response()->json(['paid' => true]);
                }
            } catch (\Throwable) {
                // Invoice хүчингүй болсон — шинэ invoice үүсгэнэ
            }
        }

        try {
            $invoiceNo   = 'LS-' . $plan->id . '-' . $unpaid->installment_number . '-' . time();
            $description = "Лизинг #{$plan->id} — {$unpaid->installment_number}-р сар";
            $callbackUrl = route('patient.leasing.callback', ['planId' => $plan->id]);

            $invoice = $this->qpay->createLeasingInvoice($invoiceNo, $description, $unpaid->amount, $callbackUrl);

            $plan->update(['qpay_invoice_id' => $invoice['invoice_id']]);

            return response()->json([
                'paid'               => false,
                'invoice_id'         => $invoice['invoice_id'],
                'qr_image'           => $invoice['qr_image']      ?? null,
                'qr_text'            => $invoice['qr_text']       ?? null,
                'qpay_deeplink'      => $invoice['qpay_deeplink'] ?? [],
                'amount'             => $unpaid->amount,
                'installment_number' => $unpaid->installment_number,
            ]);
        } catch (\Throwable $e) {
            Log::error('Patient leasing QPay invoice error', ['plan' => $plan->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'QPay холбогдоход алдаа гарлаа: ' . $e->getMessage()], 500);
        }
    }

    /* ── Статус шалгах (frontend polling) ───────────────────── */

    public function checkStatus(LeasingPlan $plan): JsonResponse
    {
        $patient = Auth::user()->patient;
        if (!$patient || $plan->patient_id !== $patient->id) {
            abort(403);
        }

        if (!$plan->qpay_invoice_id) {
            return response()->json(['paid' => false, 'error' => 'Invoice олдсонгүй']);
        }

        try {
            $paid = $this->qpay->checkPayment($plan->qpay_invoice_id);
            if ($paid) {
                $this->processPayment($plan);
                return response()->json(['paid' => true]);
            }
        } catch (\Throwable $e) {
            Log::warning('Patient leasing checkStatus error', ['plan' => $plan->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['paid' => false]);
    }

    /* ── QPay callback (QPay сервер дуудна, auth шаардахгүй) ── */

    public function callback(int $planId): JsonResponse
    {
        $plan = LeasingPlan::find($planId);

        if (!$plan || !$plan->qpay_invoice_id) {
            return response()->json(['status' => 'ok']);
        }

        try {
            $paid = $this->qpay->checkPayment($plan->qpay_invoice_id);
            if ($paid) {
                $this->processPayment($plan);
            }
        } catch (\Throwable $e) {
            Log::error('Patient leasing QPay callback error', ['plan_id' => $planId, 'error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'ok']);
    }

    /* ── Төлбөр баталгаажуулах ──────────────────────────────── */

    private function processPayment(LeasingPlan $plan): void
    {
        DB::transaction(function () use ($plan) {
            // Race condition-с сэргийлэх — мөрийг lock хийх
            $plan = LeasingPlan::where('id', $plan->id)->lockForUpdate()->first();

            // Invoice аль хэдийн цэвэрлэгдсэн бол → давхар боловсруулалтаас зайлсхийх
            if (!$plan->qpay_invoice_id) return;

            $unpaid = $plan->installments()
                ->whereNull('paid_at')
                ->orderBy('installment_number')
                ->first();

            if (!$unpaid) {
                $plan->update(['qpay_invoice_id' => null]);
                return;
            }

            // Хуваарийг төлөгдсөн болгох
            $unpaid->update(['paid_at' => now()]);
            $plan->increment('paid_months');
            $plan->update(['qpay_invoice_id' => null]);

            // TreatmentRecord.paid_amount шинэчлэх
            $record = $plan->treatmentRecord()->with(['patient', 'doctor', 'appointment'])->first();
            $newPaidAmount  = ($record->paid_amount ?? 0) + $unpaid->amount;
            $remainingCount = $plan->installments()->whereNull('paid_at')->count();

            if ($remainingCount === 0) {
                $record->update([
                    'payment_status' => 'paid',
                    'paid_amount'    => $newPaidAmount,
                    'paid_at'        => now(),
                    'payment_method' => 'qpay',
                ]);
            } else {
                $record->update(['paid_amount' => $newPaidAmount]);
            }

            // Өдрийн тооцоонд нэмэх
            $this->addToDailySheet($record, $unpaid->amount, $unpaid->installment_number);

            // Ресепшн / Админд мэдэгдэл явуулах
            $this->notifyReception($plan, $record, $unpaid->amount, $unpaid->installment_number);
        });
    }

    /* ── Өдрийн тооцоонд нэмэх ─────────────────────────────── */

    private function addToDailySheet(TreatmentRecord $record, int $amount, int $installmentNum): void
    {
        $branchId = $record->doctor?->branch_id;

        $sheet = DailySheet::firstOrCreate(
            ['branch_id' => $branchId, 'date' => today()->toDateString()],
            ['status' => 'submitted']
        );

        DailySheetEntry::create([
            'daily_sheet_id'     => $sheet->id,
            'user_id'            => null,
            'row_order'          => $sheet->entries()->max('row_order') + 1,
            'patient_name'       => $record->patient ? trim("{$record->patient->last_name} {$record->patient->first_name}") : null,
            'diagnosis'          => "Лизинг {$installmentNum}-р сар (QPay — портал)",
            'appointment_number' => $record->appointment?->appointment_number,
            'discount'           => 0,
            'cash_amount'        => 0,
            'card_amount'        => 0,
            'mobile_amount'      => $amount,
            'storepay_amount'    => 0,
            'total_amount'       => $amount,
            'outstanding_amount' => 0,
            'doctor_id'          => $record->doctor_id,
        ]);
    }

    /* ── Ресепшнд notification явуулах ─────────────────────── */

    private function notifyReception(LeasingPlan $plan, TreatmentRecord $record, int $amount, int $installmentNum): void
    {
        $patient     = $plan->patient;
        $patientName = $patient ? trim("{$patient->last_name} {$patient->first_name}") : '—';
        $branchId    = $record->doctor?->branch_id;

        $staffUsers = User::whereHas('role', fn($q) => $q->whereIn('name', ['receptionist', 'admin']))
            ->when($branchId, fn($q) => $q->where(fn($q2) =>
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id')
            ))
            ->get();

        foreach ($staffUsers as $staff) {
            $staff->notify(new LeasingPaidByPatient(
                patientName:       $patientName,
                amount:            $amount,
                installmentNumber: $installmentNum,
                planId:            $plan->id,
            ));
        }
    }
}
