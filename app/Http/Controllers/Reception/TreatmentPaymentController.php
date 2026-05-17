<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\LeasingInstallment;
use App\Models\LeasingPlan;
use App\Models\TreatmentRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TreatmentPaymentController extends Controller
{
    private function branchId(): ?int
    {
        return Auth::user()->branch_id;
    }

    private function genderMn(?string $gender): ?string
    {
        return match ($gender) {
            'male' => 'Эр',
            'female' => 'Эм',
            default => $gender,
        };
    }

    private function mapRecord(TreatmentRecord $r): array
    {
        return [
            'id' => $r->id,
            'patient_id' => $r->patient?->id,
            'patient_name' => $r->patient ? trim("{$r->patient->last_name} {$r->patient->first_name}") : '—',
            'patient_number' => $r->patient?->patient_number,
            'doctor_name' => $r->doctor?->name,
            'doctor_id' => $r->doctor_id,
            'services' => $r->services ?? [],
            'amount_charged' => $r->amount_charged,
            'paid_amount' => $r->paid_amount,
            'payment_method' => $r->payment_method,
            'record_date' => $r->record_date?->toDateString(),
            'appointment_number' => $r->appointment?->appointment_number,
            'appointment_id' => $r->appointment_id,
        ];
    }

    public function index()
    {
        $branchId = $this->branchId();

        $base = TreatmentRecord::with(['patient', 'doctor', 'appointment'])
            ->when($branchId, fn ($q) => $q->whereHas('doctor', fn ($d) => $d->where('branch_id', $branchId)));

        $pending = (clone $base)
            ->where('payment_status', 'sent')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => $this->mapRecord($r));

        $partial = (clone $base)
            ->where('payment_status', 'partial')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => array_merge($this->mapRecord($r), [
                'remaining' => ($r->amount_charged ?? 0) - ($r->paid_amount ?? 0),
            ]));

        $leasingRecords = (clone $base)
            ->where('payment_status', 'leasing')
            ->with(['leasingPlan.installments'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => array_merge($this->mapRecord($r), [
                'leasing_plan' => $r->leasingPlan ? [
                    'id' => $r->leasingPlan->id,
                    'total_amount' => $r->leasingPlan->total_amount,
                    'months' => $r->leasingPlan->months,
                    'monthly_amount' => $r->leasingPlan->monthly_amount,
                    'paid_months' => $r->leasingPlan->paid_months,
                    'remaining_months' => $r->leasingPlan->months - $r->leasingPlan->paid_months,
                    'remaining_amount' => $r->leasingPlan->total_amount - ($r->leasingPlan->paid_months * $r->leasingPlan->monthly_amount),
                    'start_date' => $r->leasingPlan->created_at->toDateString(),
                    'end_date' => $r->leasingPlan->installments->last()?->due_date?->toDateString(),
                    'installments' => $r->leasingPlan->installments->map(fn ($i) => [
                        'id' => $i->id,
                        'installment_number' => $i->installment_number,
                        'amount' => $i->amount,
                        'due_date' => $i->due_date?->toDateString(),
                        'payment_method' => $i->payment_method,
                        'paid_at' => $i->paid_at?->toDateString(),
                        'is_paid' => $i->paid_at !== null,
                        'is_overdue' => $i->paid_at === null && $i->due_date !== null && $i->due_date->isPast(),
                    ])->all(),
                ] : null,
            ]));

        $today = TreatmentRecord::with(['patient', 'doctor'])
            ->when($branchId, fn ($q) => $q->whereHas('doctor', fn ($d) => $d->where('branch_id', $branchId)))
            ->whereDate('paid_at', today())
            ->whereIn('payment_status', ['paid', 'partial'])
            ->orderByDesc('paid_at')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'patient_name' => $r->patient ? trim("{$r->patient->last_name} {$r->patient->first_name}") : '—',
                'doctor_name' => $r->doctor?->name,
                'services' => $r->services ?? [],
                'amount_charged' => $r->amount_charged,
                'paid_amount' => $r->paid_amount ?? $r->amount_charged,
                'outstanding' => $r->payment_status === 'partial'
                    ? max(0, ($r->amount_charged ?? 0) - ($r->paid_amount ?? 0))
                    : null,
                'payment_method' => $r->payment_method,
                'paid_at' => $r->paid_at?->format('H:i'),
                'type' => $r->payment_status === 'partial' ? 'partial' : 'treatment',
            ]);

        // Өнөөдөр төлсөн лизингийн дансуудыг нэмнэ
        $todayLeasing = LeasingInstallment::with(['leasingPlan.treatmentRecord.patient', 'leasingPlan.treatmentRecord.doctor'])
            ->whereDate('paid_at', today())
            ->whereHas('leasingPlan.treatmentRecord.doctor', function ($q) use ($branchId) {
                if ($branchId) {
                    $q->where('branch_id', $branchId);
                }
            })
            ->orderByDesc('paid_at')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'patient_name' => $i->leasingPlan->treatmentRecord->patient
                    ? trim("{$i->leasingPlan->treatmentRecord->patient->last_name} {$i->leasingPlan->treatmentRecord->patient->first_name}")
                    : '—',
                'doctor_name' => $i->leasingPlan->treatmentRecord->doctor?->name,
                'services' => [['name' => "{$i->installment_number}-р сарын лизинг"]],
                'amount_charged' => $i->amount,
                'paid_amount' => $i->amount,
                'payment_method' => $i->payment_method,
                'paid_at' => $i->paid_at?->format('H:i'),
                'type' => 'leasing',
            ]);

        $today = $today->concat($todayLeasing)->sortByDesc('paid_at')->values();
        $todayTotal = $today->sum('paid_amount');

        return Inertia::render('reception/treatment-payments/index', [
            'pending' => $pending,
            'partial' => $partial,
            'leasing' => $leasingRecords,
            'today' => $today,
            'today_total' => $todayTotal,
        ]);
    }

    public function poll(): JsonResponse
    {
        $branchId = $this->branchId();

        $base = TreatmentRecord::with(['patient', 'doctor', 'appointment'])
            ->when($branchId, fn ($q) => $q->whereHas('doctor', fn ($d) => $d->where('branch_id', $branchId)));

        $pending = (clone $base)
            ->where('payment_status', 'sent')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => $this->mapRecord($r))
            ->values();

        $partial = (clone $base)
            ->where('payment_status', 'partial')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => array_merge($this->mapRecord($r), [
                'remaining' => ($r->amount_charged ?? 0) - ($r->paid_amount ?? 0),
            ]))
            ->values();

        $leasing = (clone $base)
            ->where('payment_status', 'leasing')
            ->with(['leasingPlan.installments'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => array_merge($this->mapRecord($r), [
                'leasing_plan' => $r->leasingPlan ? [
                    'id' => $r->leasingPlan->id,
                    'total_amount' => $r->leasingPlan->total_amount,
                    'months' => $r->leasingPlan->months,
                    'monthly_amount' => $r->leasingPlan->monthly_amount,
                    'paid_months' => $r->leasingPlan->paid_months,
                    'remaining_months' => $r->leasingPlan->months - $r->leasingPlan->paid_months,
                    'remaining_amount' => $r->leasingPlan->total_amount - ($r->leasingPlan->paid_months * $r->leasingPlan->monthly_amount),
                    'start_date' => $r->leasingPlan->created_at->toDateString(),
                    'end_date' => $r->leasingPlan->installments->last()?->due_date?->toDateString(),
                    'installments' => $r->leasingPlan->installments->map(fn ($i) => [
                        'id' => $i->id,
                        'installment_number' => $i->installment_number,
                        'amount' => $i->amount,
                        'due_date' => $i->due_date?->toDateString(),
                        'payment_method' => $i->payment_method,
                        'paid_at' => $i->paid_at?->toDateString(),
                        'is_paid' => $i->paid_at !== null,
                        'is_overdue' => $i->paid_at === null && $i->due_date !== null && $i->due_date->isPast(),
                    ])->all(),
                ] : null,
            ]))
            ->values();

        return response()->json(compact('pending', 'partial', 'leasing'));
    }

    public function confirm(Request $request, TreatmentRecord $record)
    {
        $branchId = $this->branchId();

        if ($branchId && $record->doctor && $record->doctor->branch_id !== $branchId) {
            abort(403);
        }

        if (! in_array($record->payment_status, ['sent', 'partial'])) {
            return back()->with('info', 'Аль хэдийн баталгаажсан байна.');
        }

        $validated = $request->validate([
            'payment_method' => 'nullable|in:partial,leasing',
            'partial_method' => 'nullable|in:cash,card,bank,qpay,storepay',
            'payments' => 'nullable|array|min:1',
            'payments.*.method' => 'required_with:payments|in:cash,card,bank,qpay,storepay',
            'payments.*.amount' => 'required_with:payments|integer|min:1',
            'paid_amount' => 'nullable|integer|min:1',
            'months' => 'nullable|integer|min:1|max:60',
            'payment_note' => 'nullable|string|max:500',
            'discount_percent' => 'nullable|integer|min:0|max:100',
        ]);

        $method = $validated['payment_method'] ?? 'normal';
        $total = $record->amount_charged ?? 0;
        $prevPaid = $record->paid_amount ?? 0;
        $discountPct = (int) ($validated['discount_percent'] ?? 0);
        $discountAmt = (int) round($total * $discountPct / 100);
        $finalTotal = $total - $discountAmt;

        $outstandingCleared = false;

        DB::transaction(function () use ($record, $method, $finalTotal, $discountPct, $discountAmt, $prevPaid, $validated, &$outstandingCleared) {
            if ($method === 'leasing') {
                $months = $validated['months'] ?? 3;
                $base = (int) floor($finalTotal / $months);
                $last = $finalTotal - $base * ($months - 1);

                $plan = LeasingPlan::create([
                    'treatment_record_id' => $record->id,
                    'patient_id' => $record->patient_id,
                    'total_amount' => $finalTotal,
                    'months' => $months,
                    'monthly_amount' => $base,
                    'paid_months' => 0,
                    'created_by_id' => Auth::id(),
                ]);

                $startDate = $record->record_date ?? today();
                for ($i = 1; $i <= $months; $i++) {
                    $plan->installments()->create([
                        'installment_number' => $i,
                        'due_date' => $startDate->copy()->addMonths($i)->toDateString(),
                        'amount' => $i === $months ? $last : $base,
                    ]);
                }

                $record->update([
                    'payment_status' => 'leasing',
                    'payment_method' => 'leasing',
                    'payment_note' => $validated['payment_note'] ?? null,
                    'discount_percent' => $discountPct,
                    'discount_amount' => $discountAmt,
                ]);

                return;
            }

            if ($method === 'partial') {
                $partialMethod = $validated['partial_method'] ?? 'cash';
                $newPaid = $prevPaid + (int) ($validated['paid_amount'] ?? 0);
                $remaining = $finalTotal - $newPaid;

                if ($remaining <= 0) {
                    // Бүрэн төлөгдлөө — outstanding-г хаана
                    $outstandingCleared = true;
                    $justPaid = (int) ($validated['paid_amount'] ?? 0);
                    $record->update([
                        'payment_status' => 'paid',
                        'payment_method' => $partialMethod,
                        'paid_amount' => $finalTotal,
                        'discount_percent' => $discountPct,
                        'discount_amount' => $discountAmt,
                        'paid_at' => now(),
                        'paid_by_id' => Auth::id(),
                        'payment_note' => $validated['payment_note'] ?? null,
                    ]);
                    $this->addToDailySheet($record, $partialMethod, $justPaid, 0, null, 0);
                } else {
                    // Хэсэгчлэн — шинэ outstanding entry үүснэ, хуучныг хэвээр үлдээнэ
                    $record->update([
                        'payment_status' => 'partial',
                        'payment_method' => $partialMethod,
                        'paid_amount' => $newPaid,
                        'discount_percent' => $discountPct,
                        'discount_amount' => $discountAmt,
                        'paid_at' => now(),
                        'paid_by_id' => Auth::id(),
                        'payment_note' => $validated['payment_note'] ?? null,
                    ]);
                    $this->addToDailySheet($record, $partialMethod, (int) ($validated['paid_amount'] ?? 0), $remaining, null, $discountAmt);
                }

                return;
            }

            // Mixed / full payment via payments array — бүрэн төлөгдлөө
            $outstandingCleared = true;
            $payments = $validated['payments'] ?? [];
            $primaryMethod = collect($payments)->sortByDesc('amount')->first()['method'] ?? 'cash';

            $record->update([
                'payment_status' => 'paid',
                'payment_method' => $primaryMethod,
                'paid_amount' => $finalTotal,
                'discount_percent' => $discountPct,
                'discount_amount' => $discountAmt,
                'paid_at' => now(),
                'paid_by_id' => Auth::id(),
                'payment_note' => $validated['payment_note'] ?? null,
            ]);
            $this->addToDailySheetMixed($record, $payments, $discountAmt);
        });

        // Зөвхөн бүрэн төлөгдсөн үед л outstanding-г хаана
        if ($outstandingCleared) {
            $record->load('appointment', 'patient');
            $this->markOutstandingPaid($record);
        }

        $messages = [
            'leasing' => 'Лизинг бүртгэгдлээ. '.($validated['months'] ?? 3).' сар.',
            'partial' => 'Дутуу төлбөр бүртгэгдлээ.',
        ];

        return back()->with('success', $messages[$method] ?? 'Төлбөр баталгаажлаа.');
    }

    public function payInstallment(Request $request, LeasingPlan $plan)
    {
        $branchId = $this->branchId();
        $record = $plan->treatmentRecord()->with('doctor')->first();

        if ($branchId && $record->doctor && $record->doctor->branch_id !== $branchId) {
            abort(403);
        }

        $validated = $request->validate([
            'payment_method' => 'required|in:cash,card,bank,qpay,storepay',
            'count' => 'nullable|integer|min:1|max:60',
            'notes' => 'nullable|string|max:500',
        ]);

        $count = (int) ($validated['count'] ?? 1);

        $unpaid = $plan->installments()
            ->whereNull('paid_at')
            ->orderBy('installment_number')
            ->limit($count)
            ->get();

        if ($unpaid->isEmpty()) {
            return back()->with('info', 'Бүх лизингийн төлбөр дуусчээ.');
        }

        $actualCount = $unpaid->count();
        $totalAmount = $unpaid->sum('amount');
        $firstNum = $unpaid->first()->installment_number;
        $lastNum = $unpaid->last()->installment_number;

        DB::transaction(function () use ($plan, $unpaid, $record, $validated, $actualCount, $totalAmount, $firstNum, $lastNum) {
            foreach ($unpaid as $inst) {
                $inst->update([
                    'paid_at' => now(),
                    'paid_by_id' => Auth::id(),
                    'payment_method' => $validated['payment_method'],
                    'notes' => $validated['notes'] ?? null,
                ]);
            }

            $plan->increment('paid_months', $actualCount);

            $newPaidAmount = ($record->paid_amount ?? 0) + $totalAmount;

            $remaining = $plan->installments()->whereNull('paid_at')->count();
            if ($remaining === 0) {
                $record->update([
                    'payment_status' => 'paid',
                    'paid_amount' => $newPaidAmount,
                    'paid_at' => now(),
                    'paid_by_id' => Auth::id(),
                ]);
            } else {
                $record->update(['paid_amount' => $newPaidAmount]);
            }

            $note = $actualCount > 1
                ? "{$firstNum}–{$lastNum}-р сарын лизинг"
                : "{$firstNum}-р сарын лизинг";

            $this->addToDailySheet($record, $validated['payment_method'], $totalAmount, 0, $note);
        });

        $record->load('appointment', 'patient');
        $this->markOutstandingPaid($record);

        $plan->refresh();
        $remaining = $plan->months - $plan->paid_months;

        $rangeLabel = $actualCount > 1 ? "{$firstNum}–{$lastNum}-р сар" : "{$firstNum}-р сар";
        $message = $remaining > 0
            ? "{$rangeLabel}-ын төлбөр бүртгэгдлээ. Үлдэгдэл: {$remaining} сар."
            : 'Лизингийн бүх төлбөр дууслаа!';

        return back()->with('success', $message);
    }

    // Тохирох outstanding entry-г автоматаар хаана
    private function markOutstandingPaid(TreatmentRecord $record): void
    {
        $branchId = $this->branchId();

        $query = DailySheetEntry::whereHas('dailySheet', fn ($q) => $q->where('branch_id', $branchId))
            ->where('outstanding_amount', '>', 0)
            ->whereNull('outstanding_paid_at');

        if ($record->appointment?->appointment_number) {
            $query->where('appointment_number', $record->appointment->appointment_number);
        } elseif ($record->patient) {
            $patientName = trim("{$record->patient->last_name} {$record->patient->first_name}");
            $query->where('patient_name', $patientName)
                ->where('doctor_id', $record->doctor_id);
        } else {
            return;
        }

        $query->update(['outstanding_paid_at' => now()]);
    }

    private function addToDailySheetMixed(
        TreatmentRecord $record,
        array $payments,
        int $discount = 0,
        int $outstanding = 0
    ): void {
        $branchId = $this->branchId();

        $sheet = DailySheet::firstOrCreate(
            ['branch_id' => $branchId, 'date' => today()->toDateString()],
            ['status' => 'submitted']
        );

        $services = collect($record->services ?? [])->pluck('name')->filter()->implode(', ');
        $cashAmt = $cardAmt = $mobileAmt = $storepayAmt = 0;

        foreach ($payments as $p) {
            $amt = (int) ($p['amount'] ?? 0);
            match ($p['method'] ?? '') {
                'card' => $cardAmt += $amt,
                'bank', 'qpay' => $mobileAmt += $amt,
                'storepay' => $storepayAmt += $amt,
                default => $cashAmt += $amt,
            };
        }

        $total = $cashAmt + $cardAmt + $mobileAmt + $storepayAmt;

        DailySheetEntry::create([
            'daily_sheet_id' => $sheet->id,
            'user_id' => Auth::id(),
            'source' => 'treatment',
            'row_order' => $sheet->entries()->max('row_order') + 1,
            'patient_name' => $record->patient ? trim("{$record->patient->last_name} {$record->patient->first_name}") : null,
            'gender' => $this->genderMn($record->patient?->gender),
            'diagnosis' => $services ?: null,
            'appointment_number' => $record->appointment?->appointment_number,
            'discount' => $discount,
            'cash_amount' => $cashAmt,
            'card_amount' => $cardAmt,
            'mobile_amount' => $mobileAmt,
            'storepay_amount' => $storepayAmt,
            'total_amount' => $total,
            'outstanding_amount' => $outstanding,
            'doctor_id' => $record->doctor_id,
        ]);
    }

    private function addToDailySheet(
        TreatmentRecord $record,
        string $method,
        int $amount,
        int $outstanding = 0,
        ?string $extraNote = null,
        int $discount = 0
    ): void {
        $branchId = $this->branchId();

        $sheet = DailySheet::firstOrCreate(
            ['branch_id' => $branchId, 'date' => today()->toDateString()],
            ['status' => 'submitted']
        );

        $services = collect($record->services ?? [])->pluck('name')->filter()->implode(', ');
        $diagnosis = $extraNote ?? ($services ?: null);

        $cashAmt = 0;
        $cardAmt = 0;
        $mobileAmt = 0;
        $storepayAmt = 0;

        match ($method) {
            'cash' => $cashAmt = $amount,
            'card' => $cardAmt = $amount,
            'bank', 'qpay' => $mobileAmt = $amount,
            'storepay' => $storepayAmt = $amount,
            'partial' => $cashAmt = $amount,
            default => $cashAmt = $amount,
        };

        $total = $cashAmt + $cardAmt + $mobileAmt + $storepayAmt;

        DailySheetEntry::create([
            'daily_sheet_id' => $sheet->id,
            'user_id' => Auth::id(),
            'source' => 'treatment',
            'row_order' => $sheet->entries()->max('row_order') + 1,
            'patient_name' => $record->patient ? trim("{$record->patient->last_name} {$record->patient->first_name}") : null,
            'gender' => $this->genderMn($record->patient?->gender),
            'diagnosis' => $diagnosis,
            'appointment_number' => $record->appointment?->appointment_number,
            'discount' => $discount,
            'cash_amount' => $cashAmt,
            'card_amount' => $cardAmt,
            'mobile_amount' => $mobileAmt,
            'storepay_amount' => $storepayAmt,
            'total_amount' => $total,
            'outstanding_amount' => $outstanding,
            'doctor_id' => $record->doctor_id,
        ]);
    }
}
