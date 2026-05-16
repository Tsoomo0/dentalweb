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

        $sheet = DailySheet::with(['entries.doctor', 'entries.user', 'receptionist', 'morningReceptionist'])
            ->where('branch_id', $branchId)
            ->whereDate('date', $date)
            ->first();

        $doctors = Doctor::where('is_active', true)
            ->when($branchId, fn($q) => $q->whereHas('branches', fn($b) => $b->where('branches.id', $branchId)))
            ->orderBy('name')
            ->get(['id', 'name']);

        $treatments = Treatment::orderBy('title')->get(['id', 'title']);

        $technicians = \DB::table('employees')
            ->join('positions', 'employees.position_id', '=', 'positions.id')
            ->where('positions.name', 'Рентген техникч')
            ->where('employees.status', 'active')
            ->when($branchId, fn($q) => $q->where('employees.branch_id', $branchId))
            ->whereNull('employees.deleted_at')
            ->get(['employees.id', 'employees.first_name', 'employees.last_name'])
            ->map(fn($e) => ['id' => $e->id, 'name' => trim($e->last_name . ' ' . $e->first_name)])
            ->values()
            ->all();

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
            'technicians'         => $technicians,
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
            'date'                              => 'required|date',
            'entries'                           => 'array',
            'entries.*.patient_name'            => 'nullable|string|max:255',
            'entries.*.gender'                  => 'nullable|string|max:10',
            'entries.*.diagnosis'               => 'nullable|string|max:500',
            'entries.*.appointment_number'      => 'nullable|string|max:50',
            'entries.*.gross_amount'            => 'nullable|integer|min:0',
            'entries.*.discount'                => 'nullable|integer|min:0|max:100',
            'entries.*.mobile_amount'           => 'nullable|integer|min:0',
            'entries.*.card_amount'             => 'nullable|integer|min:0',
            'entries.*.cash_amount'             => 'nullable|integer|min:0',
            'entries.*.storepay_amount'         => 'nullable|integer|min:0',
            'entries.*.outstanding_amount'           => 'nullable|integer|min:0',
            'entries.*.doctor_id'                    => 'nullable|exists:doctors,id',
            'entries.*.technician_employee_id'       => 'nullable|exists:employees,id',
            'entries.*.supply_orthodontic_brush'     => 'nullable|integer|min:0',
            'entries.*.supply_interdental_brush'     => 'nullable|integer|min:0',
            'entries.*.supply_dental_floss'          => 'nullable|integer|min:0',
            'entries.*.supply_wax'                   => 'nullable|integer|min:0',
            'entries.*.supply_retainer_case'         => 'nullable|integer|min:0',
            'entries.*.supply_removable_app_case'    => 'nullable|integer|min:0',
            'entries.*.entry_notes'                  => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($request, $branchId, $userId, $date) {
            $sheet = DailySheet::firstOrCreate(
                ['branch_id' => $branchId, 'date' => $date],
                ['status' => 'submitted']
            );

            if ($sheet->submitted_at !== null) {
                return;
            }

            // source='treatment' (auto) болон outstanding_paid_at тавьсан (paid) мөрүүдийг хадгалж үлдээнэ.
            $sheet->entries()
                ->where('user_id', $userId)
                ->whereNull('source')
                ->whereNull('outstanding_paid_at')
                ->where('is_morning_entry', false)   // ← Өглөөний мөрүүдийг устгахгүй
                ->delete();

            // Хадгалагдсан paid entry-уудын identifying data — давхар үүсэхээс сэргийлэх.
            $preservedKeys = $sheet->entries()
                ->where('user_id', $userId)
                ->whereNotNull('outstanding_paid_at')
                ->get(['id', 'patient_name', 'appointment_number', 'outstanding_amount'])
                ->map(fn ($e) => trim((string) $e->patient_name) . '|' . trim((string) $e->appointment_number) . '|' . (int) $e->outstanding_amount)
                ->all();

            $rowIdx = 0;
            foreach ($request->input('entries', []) as $row) {
                $mobile   = (int) ($row['mobile_amount'] ?? 0);
                $card     = (int) ($row['card_amount'] ?? 0);
                $cash     = (int) ($row['cash_amount'] ?? 0);
                $storepay = (int) ($row['storepay_amount'] ?? 0);
                $discount = (int) ($row['discount'] ?? 0);
                $gross    = (int) ($row['gross_amount'] ?? 0);
                $name     = trim($row['patient_name'] ?? '');
                $sum      = $mobile + $card + $cash + $storepay;
                $outstd   = (int) ($row['outstanding_amount'] ?? 0);
                $aptNumber = trim($row['appointment_number'] ?? '') ?: null;

                // gross_amount байвал total = gross * (1 - discount%), үгүй бол payment нийлбэр
                $total = $gross > 0
                    ? (int) round($gross * (1 - $discount / 100))
                    : $sum;

                // Илүү тооцоо: gross байхад payment нийлбэр total-аас их бол
                $overpaid = ($gross > 0 && $sum > $total) ? $sum - $total : 0;

                if ($name === '' && $sum === 0 && $discount === 0 && $gross === 0) {
                    continue;
                }

                // Хэрэв энэ row нь өмнө төлсөн entry-тэй яг тааравал давхар үүсгэхгүй.
                $rowKey = $name . '|' . ($aptNumber ?? '') . '|' . $outstd;
                if (in_array($rowKey, $preservedKeys, true)) {
                    continue;
                }

                $aptId = $aptNumber
                    ? \App\Models\Appointment::where('appointment_number', $aptNumber)->value('id')
                    : null;

                DailySheetEntry::create([
                    'daily_sheet_id'             => $sheet->id,
                    'user_id'                    => $userId,
                    'row_order'                  => $rowIdx++,
                    'patient_name'               => $name ?: null,
                    'gender'                     => $row['gender'] ?? null,
                    'diagnosis'                  => trim($row['diagnosis'] ?? '') ?: null,
                    'appointment_number'         => $aptNumber,
                    'appointment_id'             => $aptId,
                    'gross_amount'               => $gross,
                    'discount'                   => $discount,
                    'mobile_amount'              => $mobile,
                    'card_amount'                => $card,
                    'cash_amount'                => $cash,
                    'storepay_amount'            => $storepay,
                    'total_amount'               => $total,
                    'overpaid_amount'            => $overpaid,
                    'outstanding_amount'         => $outstd,
                    'doctor_id'                  => $row['doctor_id'] ?? null,
                    'technician_employee_id'     => $row['technician_employee_id'] ?? null,
                    'supply_orthodontic_brush'   => (int) ($row['supply_orthodontic_brush'] ?? 0),
                    'supply_interdental_brush'   => (int) ($row['supply_interdental_brush'] ?? 0),
                    'supply_dental_floss'        => (int) ($row['supply_dental_floss'] ?? 0),
                    'supply_wax'                 => (int) ($row['supply_wax'] ?? 0),
                    'supply_retainer_case'       => (int) ($row['supply_retainer_case'] ?? 0),
                    'supply_removable_app_case'  => (int) ($row['supply_removable_app_case'] ?? 0),
                    'entry_notes'                => trim($row['entry_notes'] ?? '') ?: null,
                ]);
            }
        });

        return back()->with('success', 'Хадгалагдлаа.');
    }

    public function submitMorning(Request $request): RedirectResponse
    {
        $branchId = $this->branchId();
        $date     = $request->input('date', today()->toDateString());

        $request->validate(['date' => 'required|date']);

        $sheet = DailySheet::firstOrCreate(
            ['branch_id' => $branchId, 'date' => $date],
            ['status' => 'submitted']
        );

        if ($sheet->morning_submitted_at !== null) {
            return back()->with('info', 'Өглөөний баталгаажуулалт хийгдсэн байна.');
        }

        $sheet->update([
            'morning_receptionist_id' => Auth::id(),
            'morning_submitted_at'    => now(),
        ]);

        $sheet->entries()->update(['is_morning_entry' => true]);

        return back()->with('success', 'Өглөөний баталгаажуулалт хийгдлээ.');
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

    public function outstanding(Request $request): Response
    {
        $branchId = $this->branchId();
        $userId   = Auth::id();
        $mode     = $request->get('mode', 'day');   // day | week | month | all
        $date     = $request->get('date', today()->toDateString());
        $month    = $request->get('month', today()->format('Y-m'));

        [$year, $mon] = explode('-', $month);

        $entries = DailySheetEntry::whereHas('dailySheet', fn($q) => $q->where('branch_id', $branchId))
            ->where('outstanding_amount', '>', 0)
            ->with(['dailySheet', 'doctor', 'user'])
            ->when($mode === 'day',   fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereDate('date', $date)))
            ->when($mode === 'week',  fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereBetween('date', [
                now()->parse($date)->subDays(6)->toDateString(), $date
            ])))
            ->when($mode === 'month', fn($q) => $q->whereHas('dailySheet', fn($q2) => $q2->whereYear('date', $year)->whereMonth('date', $mon)))
            ->orderByRaw('outstanding_paid_at IS NOT NULL')
            ->orderBy('created_at')
            ->get()
            ->map(fn($e) => [
                'id'                      => $e->id,
                'patient_name'            => $e->patient_name,
                'gender'                  => $e->gender,
                'diagnosis'               => $e->diagnosis,
                'appointment_number'      => $e->appointment_number,
                'outstanding_amount'      => $e->outstanding_amount,
                'date'                    => $e->dailySheet->date->toDateString(),
                'receptionist_name'       => $e->user?->name,
                'doctor_name'             => $e->doctor?->name,
                'days_since'              => (int) max(0,
                    (strtotime(today()->toDateString()) - strtotime($e->dailySheet->date->toDateString())) / 86400
                ),
                'is_mine'                 => $e->user_id === $userId,
                'is_paid'                 => $e->outstanding_paid_at !== null,
                'outstanding_paid_at'     => $e->outstanding_paid_at?->toDateString(),
                'outstanding_paid_receipt'=> $e->outstanding_paid_receipt,
                'outstanding_paid_method' => $e->outstanding_paid_method,
                'outstanding_paid_amount' => $e->outstanding_paid_amount,
            ])
            ->values()
            ->all();

        return Inertia::render('reception/outstanding/index', [
            'entries' => $entries,
            'filters' => compact('mode', 'date', 'month'),
        ]);
    }

    public function payOutstanding(Request $request, DailySheetEntry $entry): RedirectResponse
    {
        $branchId = $this->branchId();
        $userId   = Auth::id();

        if ($entry->dailySheet->branch_id !== $branchId) {
            abort(403);
        }

        if ($entry->outstanding_paid_at !== null) {
            return back()->with('info', 'Аль хэдийн төлсөн гэж тэмдэглэгдсэн байна.');
        }

        $validated = $request->validate([
            'paid_amount'  => 'required|integer|min:1',
            'paid_method'  => 'required|in:mobile,card,cash,storepay',
            'paid_receipt' => 'nullable|string|max:100',
        ]);

        // Дутуу тооцоог төлөгдсөн гэж тэмдэглэнэ
        $entry->update([
            'outstanding_paid_at'     => now(),
            'outstanding_paid_receipt'=> $validated['paid_receipt'] ?? null,
            'outstanding_paid_method' => $validated['paid_method'],
            'outstanding_paid_amount' => $validated['paid_amount'],
        ]);

        // Өнөөдрийн daily sheet-д шинэ мөр нэмнэ (balance)
        $sheet = DailySheet::firstOrCreate(
            ['branch_id' => $branchId, 'date' => today()->toDateString()],
            ['status' => 'submitted']
        );

        if ($sheet->submitted_at === null) {
            $method  = $validated['paid_method'];
            $amount  = $validated['paid_amount'];
            $apptNum = $validated['paid_receipt'] ?: $this->nextAppointmentNumber($entry->appointment_number);
            $apptId  = $apptNum
                ? \App\Models\Appointment::where('appointment_number', $apptNum)->value('id')
                : null;
            DailySheetEntry::create([
                'daily_sheet_id'     => $sheet->id,
                'user_id'            => $userId,
                'source'             => 'outstanding',
                'row_order'          => 999,
                'patient_name'       => $entry->patient_name,
                'gender'             => $entry->gender,
                'diagnosis'          => $entry->diagnosis,
                'appointment_number' => $apptNum,
                'appointment_id'     => $apptId,
                'mobile_amount'      => $method === 'mobile'   ? $amount : 0,
                'card_amount'        => $method === 'card'     ? $amount : 0,
                'cash_amount'        => $method === 'cash'     ? $amount : 0,
                'storepay_amount'    => $method === 'storepay' ? $amount : 0,
                'total_amount'       => $amount,
                'outstanding_amount' => 0,
                'discount'           => 0,
                'doctor_id'          => $entry->doctor_id,
            ]);
        }

        // Admin-д notification
        $entry->load(['dailySheet.branch']);
        $admins = User::whereHas('role', fn($q) => $q->where('name', 'admin'))->get();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, new OutstandingPaid(
                patientName:      $entry->patient_name ?? '—',
                amount:           $validated['paid_amount'],
                branchName:       $entry->dailySheet->branch?->name ?? '—',
                date:             $entry->dailySheet->date->toDateString(),
                receptionistName: Auth::user()->name,
            ));
        }

        return redirect('/reception/outstanding?mode=all')->with('success', 'Дутуу тооцоо төлөгдлөө.');
    }

    private function nextAppointmentNumber(?string $current): ?string
    {
        if (!$current) return null;
        if (preg_match('/^(.*?)(\d+)$/', $current, $m)) {
            return $m[1] . str_pad((int) $m[2] + 1, strlen($m[2]), '0', STR_PAD_LEFT);
        }
        return $current;
    }

    private function technicianName(?int $id): ?string
    {
        if (!$id) return null;
        $e = \DB::table('employees')->where('id', $id)->first(['first_name', 'last_name']);
        return $e ? trim($e->last_name . ' ' . $e->first_name) : null;
    }

    private function mapSheet(DailySheet $sheet, int $currentUserId): array
    {
        return [
            'id'                      => $sheet->id,
            'date'                    => $sheet->date->toDateString(),
            'is_confirmed'            => $sheet->submitted_at !== null,
            'submitted_at'            => $sheet->submitted_at?->toDateTimeString(),
            'receptionist'            => $sheet->receptionist?->name,
            'morning_confirmed'       => $sheet->morning_submitted_at !== null,
            'morning_submitted_at'    => $sheet->morning_submitted_at?->toDateTimeString(),
            'morning_receptionist'    => $sheet->morningReceptionist?->name,
            'supplies'                => $sheet->supplies,
            'entries'      => $sheet->entries
                ->sortBy(fn($e) => [$e->user_id === $currentUserId ? 0 : 1, $e->row_order])
                ->values()
                ->map(fn($e) => [
                    'id'                 => $e->id,
                    'is_mine'            => $e->user_id === $currentUserId,
                    'source'             => $e->source,
                    'receptionist_name'  => $e->user?->name,
                    'patient_name'       => $e->patient_name,
                    'gender'             => $e->gender,
                    'diagnosis'          => $e->diagnosis,
                    'appointment_number' => $e->appointment_number,
                    'gross_amount'       => $e->gross_amount,
                    'discount'           => $e->discount,
                    'mobile_amount'      => $e->mobile_amount,
                    'card_amount'        => $e->card_amount,
                    'cash_amount'        => $e->cash_amount,
                    'storepay_amount'    => $e->storepay_amount,
                    'total_amount'       => $e->total_amount,
                    'outstanding_amount'          => $e->outstanding_amount,
                    'outstanding_paid_at'         => $e->outstanding_paid_at?->toDateString(),
                    'doctor_id'                   => $e->doctor_id,
                    'doctor_name'                 => $e->doctor?->name,
                    'technician_employee_id'      => $e->technician_employee_id,
                    'technician_name'             => $this->technicianName($e->technician_employee_id),
                    'supply_orthodontic_brush'    => $e->supply_orthodontic_brush,
                    'supply_interdental_brush'    => $e->supply_interdental_brush,
                    'supply_dental_floss'         => $e->supply_dental_floss,
                    'supply_wax'                  => $e->supply_wax,
                    'supply_retainer_case'        => $e->supply_retainer_case,
                    'supply_removable_app_case'   => $e->supply_removable_app_case,
                    'entry_notes'                 => $e->entry_notes,
                    'is_morning_entry'            => (bool) $e->is_morning_entry,
                    'overpaid_amount'             => (int) $e->overpaid_amount,
                    'overpaid_used_at'            => $e->overpaid_used_at?->toDateTimeString(),
                    'overpaid_used_receipt'       => $e->overpaid_used_receipt,
                    'overpaid_used_method'        => $e->overpaid_used_method,
                    'overpaid_used_amount'        => $e->overpaid_used_amount,
                ])->all(),
        ];
    }

    public function overpaid(Request $request): Response
    {
        $branchId = $this->branchId();
        $userId   = Auth::id();
        $tab      = $request->get('tab', 'pending'); // pending | used

        $entries = DailySheetEntry::whereHas('dailySheet', fn($q) => $q->where('branch_id', $branchId))
            ->where('overpaid_amount', '>', 0)
            ->with(['dailySheet', 'doctor', 'user'])
            ->when($tab === 'pending', fn($q) => $q->whereNull('overpaid_used_at'))
            ->when($tab === 'used',    fn($q) => $q->whereNotNull('overpaid_used_at'))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($e) => [
                'id'                   => $e->id,
                'patient_name'         => $e->patient_name,
                'gender'               => $e->gender,
                'diagnosis'            => $e->diagnosis,
                'appointment_number'   => $e->appointment_number,
                'overpaid_amount'      => $e->overpaid_amount,
                'date'                 => $e->dailySheet->date->toDateString(),
                'receptionist_name'    => $e->user?->name,
                'doctor_name'          => $e->doctor?->name,
                'is_mine'              => $e->user_id === $userId,
                'overpaid_used_at'     => $e->overpaid_used_at?->toDateTimeString(),
                'overpaid_used_receipt'=> $e->overpaid_used_receipt,
                'overpaid_used_method' => $e->overpaid_used_method,
                'overpaid_used_amount' => $e->overpaid_used_amount,
            ])
            ->values()
            ->all();

        $pendingCount = DailySheetEntry::whereHas('dailySheet', fn($q) => $q->where('branch_id', $branchId))
            ->where('overpaid_amount', '>', 0)
            ->whereNull('overpaid_used_at')
            ->count();

        // Өнөөдрийн тооцооны баримт дугаарууд — modal autocomplete-д ашиглана
        $todaySheet = DailySheet::where('branch_id', $branchId)
            ->whereDate('date', today())
            ->with('entries')
            ->first();

        $todayEntries = $todaySheet
            ? $todaySheet->entries
                ->filter(fn($e) => filled($e->appointment_number))
                ->map(fn($e) => [
                    'appointment_number' => $e->appointment_number,
                    'patient_name'       => $e->patient_name,
                ])
                ->unique('appointment_number')
                ->values()
                ->all()
            : [];

        return Inertia::render('reception/overpaid/index', [
            'entries'      => $entries,
            'tab'          => $tab,
            'pendingCount' => $pendingCount,
            'todayEntries' => $todayEntries,
        ]);
    }

    public function applyOverpaid(Request $request, DailySheetEntry $entry): RedirectResponse
    {
        $branchId = $this->branchId();
        $userId   = Auth::id();

        if ($entry->dailySheet->branch_id !== $branchId) {
            abort(403);
        }

        if ($entry->overpaid_used_at !== null) {
            return back()->with('info', 'Илүү тооцоо аль хэдийн ашиглагдсан байна.');
        }

        if ($entry->overpaid_amount <= 0) {
            return back()->with('info', 'Илүү тооцоо байхгүй байна.');
        }

        $validated = $request->validate([
            'paid_receipt' => 'required|string|max:100',
        ]);

        $amount = $entry->overpaid_amount;

        // Анхны entry-ийн хамгийн их дүнтэй төлбөрийн аргыг автоматаар тодорхойлно
        $methodAmounts = [
            'mobile'   => (int) $entry->mobile_amount,
            'card'     => (int) $entry->card_amount,
            'cash'     => (int) $entry->cash_amount,
            'storepay' => (int) $entry->storepay_amount,
        ];
        arsort($methodAmounts);
        $method = array_key_first($methodAmounts) ?? 'cash';

        $entry->update([
            'overpaid_used_at'     => now(),
            'overpaid_used_receipt'=> $validated['paid_receipt'],
            'overpaid_used_method' => $method,
            'overpaid_used_amount' => $amount,
        ]);

        // Өнөөдрийн тооцооны тухайн баримт дугаартай entry-д нэмнэ
        $sheet = DailySheet::firstOrCreate(
            ['branch_id' => $branchId, 'date' => today()->toDateString()],
            ['status' => 'submitted']
        );

        if ($sheet->submitted_at === null) {
            $col = $method . '_amount';

            // Тохирох баримт дугаартай manual entry байвал төлбөрийн талбарт нэмнэ
            $target = $sheet->entries()
                ->where('appointment_number', $validated['paid_receipt'])
                ->whereNull('source')
                ->first();

            if ($target) {
                $target->increment($col, $amount);
            } else {
                // Байхгүй бол шинэ мөр үүсгэнэ (fallback)
                $aptId = \App\Models\Appointment::where('appointment_number', $validated['paid_receipt'])->value('id');
                DailySheetEntry::create([
                    'daily_sheet_id'     => $sheet->id,
                    'user_id'            => $userId,
                    'source'             => 'overpaid',
                    'row_order'          => 999,
                    'patient_name'       => $entry->patient_name,
                    'gender'             => $entry->gender,
                    'diagnosis'          => $entry->diagnosis,
                    'appointment_number' => $validated['paid_receipt'],
                    'appointment_id'     => $aptId,
                    'mobile_amount'      => $method === 'mobile'   ? $amount : 0,
                    'card_amount'        => $method === 'card'     ? $amount : 0,
                    'cash_amount'        => $method === 'cash'     ? $amount : 0,
                    'storepay_amount'    => $method === 'storepay' ? $amount : 0,
                    'total_amount'       => $amount,
                    'outstanding_amount' => 0,
                    'discount'           => 0,
                    'doctor_id'          => $entry->doctor_id,
                ]);
            }
        }

        return back()->with('success', 'Илүү тооцоо ашиглагдлаа.');
    }
}
