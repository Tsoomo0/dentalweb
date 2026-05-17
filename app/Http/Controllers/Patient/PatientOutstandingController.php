<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Notifications\OutstandingPaidByPatient;
use App\Services\QPayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PatientOutstandingController extends Controller
{
    public function __construct(private readonly QPayService $qpay) {}

    /* ── Invoice үүсгэх ─────────────────────────────────────── */

    public function createInvoice(TreatmentRecord $record): JsonResponse
    {
        $patient = Auth::user()->patient;
        if (! $patient || $record->patient_id !== $patient->id) {
            abort(403);
        }

        if ($record->payment_status !== 'partial') {
            return response()->json(['paid' => true]);
        }

        $remaining = max(0, ($record->amount_charged ?? 0) - ($record->paid_amount ?? 0));
        if ($remaining <= 0) {
            return response()->json(['paid' => true]);
        }

        $record->refresh();

        // Хуучин invoice байвал шалгах
        if ($record->qpay_invoice_id) {
            try {
                $paid = $this->qpay->checkPayment($record->qpay_invoice_id);
                if ($paid) {
                    $this->processPayment($record);

                    return response()->json(['paid' => true]);
                }
            } catch (\Throwable) {
                // Invoice хүчингүй болсон — шинэ invoice үүсгэнэ
            }
        }

        try {
            $invoiceNo = 'OUT-'.$record->id.'-'.time();
            $description = 'Дутуу тооцоо #'.$record->id;
            $callbackUrl = route('patient.outstanding.callback', ['recordId' => $record->id]);

            $invoice = $this->qpay->createLeasingInvoice($invoiceNo, $description, $remaining, $callbackUrl);

            $record->update(['qpay_invoice_id' => $invoice['invoice_id']]);

            return response()->json([
                'paid' => false,
                'invoice_id' => $invoice['invoice_id'],
                'qr_image' => $invoice['qr_image'] ?? null,
                'qr_text' => $invoice['qr_text'] ?? null,
                'qpay_deeplink' => $invoice['qpay_deeplink'] ?? [],
                'amount' => $remaining,
            ]);
        } catch (\Throwable $e) {
            Log::error('Patient outstanding QPay invoice error', ['record' => $record->id, 'error' => $e->getMessage()]);

            return response()->json(['error' => 'QPay холбогдоход алдаа гарлаа: '.$e->getMessage()], 500);
        }
    }

    /* ── Статус шалгах (frontend polling) ───────────────────── */

    public function checkStatus(TreatmentRecord $record): JsonResponse
    {
        $patient = Auth::user()->patient;
        if (! $patient || $record->patient_id !== $patient->id) {
            abort(403);
        }

        if (! $record->qpay_invoice_id) {
            return response()->json(['paid' => false, 'error' => 'Invoice олдсонгүй']);
        }

        try {
            $paid = $this->qpay->checkPayment($record->qpay_invoice_id);
            if ($paid) {
                $this->processPayment($record);

                return response()->json(['paid' => true]);
            }
        } catch (\Throwable $e) {
            Log::warning('Patient outstanding checkStatus error', ['record' => $record->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['paid' => false]);
    }

    /* ── QPay callback (QPay сервер дуудна, auth шаардахгүй) ── */

    public function callback(int $recordId): JsonResponse
    {
        $record = TreatmentRecord::find($recordId);

        if (! $record || ! $record->qpay_invoice_id) {
            return response()->json(['status' => 'ok']);
        }

        try {
            $paid = $this->qpay->checkPayment($record->qpay_invoice_id);
            if ($paid) {
                $this->processPayment($record);
            }
        } catch (\Throwable $e) {
            Log::error('Patient outstanding QPay callback error', ['record_id' => $recordId, 'error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'ok']);
    }

    /* ── Төлбөр баталгаажуулах ──────────────────────────────── */

    private function processPayment(TreatmentRecord $record): void
    {
        DB::transaction(function () use ($record) {
            $record = TreatmentRecord::where('id', $record->id)->lockForUpdate()->first();

            if (! $record->qpay_invoice_id) {
                return;
            }
            if ($record->payment_status !== 'partial') {
                $record->update(['qpay_invoice_id' => null]);

                return;
            }

            $remaining = max(0, ($record->amount_charged ?? 0) - ($record->paid_amount ?? 0));

            $record->update([
                'payment_status' => 'paid',
                'paid_amount' => $record->amount_charged,
                'paid_at' => now(),
                'payment_method' => 'qpay',
                'qpay_invoice_id' => null,
            ]);

            $this->addToDailySheet($record, $remaining);
            $this->notifyReception($record, $remaining);
        });
    }

    /* ── Өдрийн тооцоонд нэмэх ─────────────────────────────── */

    private function addToDailySheet(TreatmentRecord $record, int $amount): void
    {
        $branchId = $record->doctor?->branch_id;

        $sheet = DailySheet::firstOrCreate(
            ['branch_id' => $branchId, 'date' => today()->toDateString()],
            ['status' => 'submitted']
        );

        // Хаагдсан sheet-д ч нэмнэ — шөнийн төлбөрт зориулж guard хасав
        DailySheetEntry::create([
            'daily_sheet_id' => $sheet->id,
            'user_id' => null,
            'source' => 'outstanding',
            'row_order' => $sheet->entries()->max('row_order') + 1,
            'patient_name' => $record->patient ? trim("{$record->patient->last_name} {$record->patient->first_name}") : null,
            'diagnosis' => 'Дутуу тооцоо (QPay — портал)',
            'appointment_number' => $record->appointment?->appointment_number,
            'discount' => 0,
            'cash_amount' => 0,
            'card_amount' => 0,
            'mobile_amount' => $amount,
            'storepay_amount' => 0,
            'total_amount' => $amount,
            'outstanding_amount' => 0,
            'doctor_id' => $record->doctor_id,
        ]);
    }

    /* ── Ресепшнд notification явуулах ─────────────────────── */

    private function notifyReception(TreatmentRecord $record, int $amount): void
    {
        $patient = $record->patient;
        $patientName = $patient ? trim("{$patient->last_name} {$patient->first_name}") : '—';
        $branchId = $record->doctor?->branch_id;

        $staffUsers = User::whereHas('role', fn ($q) => $q->whereIn('name', ['receptionist', 'admin']))
            ->when($branchId, fn ($q) => $q->where(fn ($q2) => $q2->where('branch_id', $branchId)->orWhereNull('branch_id')
            ))
            ->get();

        foreach ($staffUsers as $staff) {
            $staff->notify(new OutstandingPaidByPatient(
                patientName: $patientName,
                amount: $amount,
                recordId: $record->id,
            ));
        }
    }
}
