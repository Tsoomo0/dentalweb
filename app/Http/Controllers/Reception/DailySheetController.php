<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\Doctor;
use App\Models\Treatment;
use App\Models\User;
use App\Notifications\DailySheetConfirmed;
use App\Notifications\OutstandingPaid;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class DailySheetController extends Controller
{
    private function branchId(): ?int
    {
        return Auth::user()->branch_id;
    }

    public function index(Request $request): Response
    {
        $branchId = $this->branchId();
        $userId   = Auth::id();
        $date     = $request->get('date', today()->toDateString());

        $sheet = DailySheet::with(['entries.doctor', 'entries.user', 'receptionist'])
            ->where('branch_id', $branchId)
            ->whereDate('date', $date)
            ->first();

        $doctors = Doctor::where('is_active', true)
            ->when($branchId, fn($q) => $q->whereHas('branches', fn($b) => $b->where('branches.id', $branchId)))
            ->orderBy('name')
            ->get(['id', 'name']);

        $treatments = Treatment::orderBy('title')->get(['id', 'title']);

        $outstandingEntries = DailySheetEntry::whereHas('dailySheet', fn($q) => $q->where('branch_id', $branchId))
            ->where('outstanding_amount', '>', 0)
            ->whereNull('outstanding_paid_at')
            ->with(['dailySheet', 'doctor', 'user'])
            ->orderBy('created_at')
            ->get()
            ->map(fn($e) => [
                'id'                 => $e->id,
                'patient_name'       => $e->patient_name,
                'diagnosis'          => $e->diagnosis,
                'outstanding_amount' => $e->outstanding_amount,
                'date'               => $e->dailySheet->date->toDateString(),
                'receptionist_name'  => $e->user?->name,
                'doctor_name'        => $e->doctor?->name,
                'days_since'         => (int) abs(now()->toDateString() !== $e->dailySheet->date->toDateString()
                    ? (strtotime(now()->toDateString()) - strtotime($e->dailySheet->date->toDateString())) / 86400
                    : 0),
                'is_mine'            => $e->user_id === $userId,
            ])
            ->values()
            ->all();

        return Inertia::render('reception/daily-sheet/index', [
            'sheet'               => $sheet ? $this->mapSheet($sheet, $userId) : null,
            'date'                => $date,
            'doctors'             => $doctors,
            'treatments'          => $treatments,
            'auth_user'           => ['id' => $userId, 'name' => Auth::user()->name],
            'outstanding_entries' => $outstandingEntries,
        ]);
    }

    public function save(Request $request): RedirectResponse
    {
        $branchId = $this->branchId();
        $userId   = Auth::id();
        $date     = $request->input('date', today()->toDateString());

        $request->validate([
            'date'                         => 'required|date',
            'entries'                      => 'array',
            'entries.*.patient_name'       => 'nullable|string|max:255',
            'entries.*.gender'             => 'nullable|string|max:10',
            'entries.*.diagnosis'          => 'nullable|string|max:500',
            'entries.*.appointment_number' => 'nullable|string|max:50',
            'entries.*.discount'           => 'nullable|integer|min:0',
            'entries.*.mobile_amount'      => 'nullable|integer|min:0',
            'entries.*.card_amount'        => 'nullable|integer|min:0',
            'entries.*.cash_amount'        => 'nullable|integer|min:0',
            'entries.*.storepay_amount'    => 'nullable|integer|min:0',
            'entries.*.outstanding_amount' => 'nullable|integer|min:0',
            'entries.*.doctor_id'          => 'nullable|exists:doctors,id',
        ]);

        DB::transaction(function () use ($request, $branchId, $userId, $date) {
            $sheet = DailySheet::firstOrCreate(
                ['branch_id' => $branchId, 'date' => $date],
                ['status' => 'submitted']
            );

            if ($sheet->submitted_at !== null) {
                return;
            }

            $sheet->entries()->where('user_id', $userId)->delete();

            $rowIdx = 0;
            foreach ($request->input('entries', []) as $row) {
                $mobile   = (int) ($row['mobile_amount'] ?? 0);
                $card     = (int) ($row['card_amount'] ?? 0);
                $cash     = (int) ($row['cash_amount'] ?? 0);
                $storepay = (int) ($row['storepay_amount'] ?? 0);
                $discount = (int) ($row['discount'] ?? 0);
                $name     = trim($row['patient_name'] ?? '');
                $sum      = $mobile + $card + $cash + $storepay;

                if ($name === '' && $sum === 0 && $discount === 0) {
                    continue;
                }

                DailySheetEntry::create([
                    'daily_sheet_id'     => $sheet->id,
                    'user_id'            => $userId,
                    'row_order'          => $rowIdx++,
                    'patient_name'       => $name ?: null,
                    'gender'             => $row['gender'] ?? null,
                    'diagnosis'          => trim($row['diagnosis'] ?? '') ?: null,
                    'appointment_number' => trim($row['appointment_number'] ?? '') ?: null,
                    'discount'           => $discount,
                    'mobile_amount'      => $mobile,
                    'card_amount'        => $card,
                    'cash_amount'        => $cash,
                    'storepay_amount'    => $storepay,
                    'total_amount'       => max(0, $sum - $discount),
                    'outstanding_amount' => (int) ($row['outstanding_amount'] ?? 0),
                    'doctor_id'          => $row['doctor_id'] ?? null,
                ]);
            }
        });

        return back()->with('success', 'Хадгалагдлаа.');
    }

    public function submit(Request $request): RedirectResponse
    {
        $branchId = $this->branchId();
        $date     = $request->input('date', today()->toDateString());

        $request->validate(['date' => 'required|date']);

        $sheet = DailySheet::where('branch_id', $branchId)
            ->whereDate('date', $date)
            ->first();

        if (!$sheet) {
            return back()->with('info', 'Тооцоо хадгалагдаагүй байна.');
        }

        if ($sheet->submitted_at !== null) {
            return back()->with('info', 'Аль хэдийн баталгаажсан байна.');
        }

        $sheet->update([
            'receptionist_id' => Auth::id(),
            'submitted_at'    => now(),
        ]);

        // Бүх admin-д notification илгээнэ
        $sheet->load(['branch', 'entries']);
        $admins = User::whereHas('role', fn($q) => $q->where('name', 'admin'))->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new DailySheetConfirmed(
                branchName:       $sheet->branch?->name ?? '—',
                date:             $sheet->date->toDateString(),
                receptionistName: Auth::user()->name,
                sheetId:          $sheet->id,
                entryCount:       $sheet->entries->count(),
                totalAmount:      (int) $sheet->entries->sum('total_amount'),
            ));
        }

        return back()->with('success', 'Өдрийн тооцоо баталгаажлаа.');
    }

    public function payOutstanding(Request $request, DailySheetEntry $entry): RedirectResponse
    {
        $branchId = $this->branchId();

        if ($entry->dailySheet->branch_id !== $branchId) {
            abort(403);
        }

        if ($entry->outstanding_paid_at !== null) {
            return back()->with('info', 'Аль хэдийн төлсөн гэж тэмдэглэгдсэн байна.');
        }

        $entry->update(['outstanding_paid_at' => now()]);

        // Бүх admin-д notification илгээнэ
        $entry->load(['dailySheet.branch']);
        $admins = User::whereHas('role', fn($q) => $q->where('name', 'admin'))->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new OutstandingPaid(
                patientName:      $entry->patient_name ?? '—',
                amount:           $entry->outstanding_amount,
                branchName:       $entry->dailySheet->branch?->name ?? '—',
                date:             $entry->dailySheet->date->toDateString(),
                receptionistName: Auth::user()->name,
            ));
        }

        return back()->with('success', 'Дутуу тооцоо төлөгдлөө.');
    }

    private function mapSheet(DailySheet $sheet, int $currentUserId): array
    {
        return [
            'id'           => $sheet->id,
            'date'         => $sheet->date->toDateString(),
            'is_confirmed' => $sheet->submitted_at !== null,
            'submitted_at' => $sheet->submitted_at?->toDateTimeString(),
            'receptionist' => $sheet->receptionist?->name,
            'entries'      => $sheet->entries
                ->sortBy(fn($e) => [$e->user_id === $currentUserId ? 0 : 1, $e->row_order])
                ->values()
                ->map(fn($e) => [
                    'id'                 => $e->id,
                    'is_mine'            => $e->user_id === $currentUserId,
                    'receptionist_name'  => $e->user?->name,
                    'patient_name'       => $e->patient_name,
                    'gender'             => $e->gender,
                    'diagnosis'          => $e->diagnosis,
                    'appointment_number' => $e->appointment_number,
                    'discount'           => $e->discount,
                    'mobile_amount'      => $e->mobile_amount,
                    'card_amount'        => $e->card_amount,
                    'cash_amount'        => $e->cash_amount,
                    'storepay_amount'    => $e->storepay_amount,
                    'total_amount'       => $e->total_amount,
                    'outstanding_amount' => $e->outstanding_amount,
                    'doctor_id'          => $e->doctor_id,
                    'doctor_name'        => $e->doctor?->name,
                ])->all(),
        ];
    }
}
