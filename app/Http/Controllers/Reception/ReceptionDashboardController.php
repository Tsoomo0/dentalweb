<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\DailySheet;
use App\Models\DailySheetEntry;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReceptionDashboardController extends Controller
{
    public function dashboard(): Response
    {
        $user     = Auth::user();
        $branch   = $user->branch;
        $branchId = $branch?->id;
        $today    = now()->toDateString();

        $baseQuery = fn() => Appointment::when($branch, fn($q) => $q->where('branch_id', $branchId));

        /* ── Daily sheet stats ── */
        $todaySheet = DailySheet::where('branch_id', $branchId)
            ->whereDate('date', $today)
            ->first();

        $todayEntries = $todaySheet
            ? DailySheetEntry::where('daily_sheet_id', $todaySheet->id)->get()
            : collect();

        $dailyStats = [
            'today_revenue'     => (int) $todayEntries->sum('total_amount'),
            'today_outstanding' => (int) $todayEntries->sum('outstanding_amount'),
            'today_cash'        => (int) $todayEntries->sum('cash_amount'),
            'today_card'        => (int) $todayEntries->sum('card_amount'),
            'today_mobile'      => (int) $todayEntries->sum('mobile_amount'),
            'today_storepay'    => (int) $todayEntries->sum('storepay_amount'),
            'today_patients'    => $todayEntries->filter(fn($e) => $e->patient_name)->count(),
            'is_confirmed'      => $todaySheet?->status === 'confirmed',
            'outstanding_total' => (int) DailySheetEntry::whereHas('dailySheet', fn($q) => $q->where('branch_id', $branchId))
                ->where('outstanding_amount', '>', 0)
                ->whereNull('outstanding_paid_at')
                ->sum('outstanding_amount'),
            'outstanding_count' => DailySheetEntry::whereHas('dailySheet', fn($q) => $q->where('branch_id', $branchId))
                ->where('outstanding_amount', '>', 0)
                ->whereNull('outstanding_paid_at')
                ->count(),
        ];

        /* ── Treatment payment stats ── */
        $treatBase = TreatmentRecord::when($branchId, fn($q) => $q->whereHas('doctor', fn($d) => $d->where('branch_id', $branchId)));

        $treatmentStats = [
            'pending_count'    => (clone $treatBase)->where('payment_status', 'sent')->count(),
            'partial_count'    => (clone $treatBase)->where('payment_status', 'partial')->count(),
            'leasing_count'    => (clone $treatBase)->where('payment_status', 'leasing')->count(),
            'today_paid_amount' => (int)(clone $treatBase)
                ->where('payment_status', 'paid')
                ->whereDate('paid_at', $today)
                ->sum('paid_amount'),
        ];

        /* ── Patient stats ── */
        $patientStats = [
            'total'          => Patient::when($branchId, fn($q) => $q->whereHas('appointments', fn($a) => $a->where('branch_id', $branchId)))->count(),
            'new_this_month' => Patient::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
        ];

        return Inertia::render('reception/dashboard', [
            'branch' => $branch ? [
                'id'      => $branch->id,
                'name'    => $branch->name,
                'address' => $branch->address,
                'phone'   => $branch->phone,
                'type'    => $branch->type,
            ] : null,
            'stats' => [
                'today'     => (clone $baseQuery())->whereDate('appointment_date', $today)->count(),
                'pending'   => (clone $baseQuery())->where('status', 'pending')->count(),
                'confirmed' => (clone $baseQuery())->where('status', 'confirmed')->count(),
                'total'     => (clone $baseQuery())->count(),
            ],
            'today_appointments' => (clone $baseQuery())
                ->with('doctor')
                ->whereDate('appointment_date', $today)
                ->orderBy('appointment_time')
                ->get()
                ->map(fn($a) => [
                    'id'                   => $a->id,
                    'appointment_number'   => $a->appointment_number,
                    'patient_name'         => $a->patient_name,
                    'patient_phone'        => $a->patient_phone,
                    'appointment_time'     => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                    'appointment_time_end' => $a->appointment_time_end ? substr($a->appointment_time_end, 0, 5) : null,
                    'service'              => $a->service,
                    'status'               => $a->status,
                    'doctor_name'          => $a->doctor?->name,
                ]),
            'pending_appointments' => (clone $baseQuery())
                ->with('doctor')
                ->where('status', 'pending')
                ->orderBy('appointment_date')
                ->orderBy('appointment_time')
                ->limit(10)
                ->get()
                ->map(fn($a) => [
                    'id'                 => $a->id,
                    'appointment_number' => $a->appointment_number,
                    'patient_name'       => $a->patient_name,
                    'patient_phone'      => $a->patient_phone,
                    'appointment_date'   => $a->appointment_date?->format('Y-m-d') ?? '',
                    'formatted_date'     => $a->appointment_date?->format('Y.m.d') ?? '—',
                    'appointment_time'   => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                    'service'            => $a->service,
                    'doctor_name'        => $a->doctor?->name,
                ]),
            'daily_stats'      => $dailyStats,
            'treatment_stats'  => $treatmentStats,
            'patient_stats'    => $patientStats,
        ]);
    }

    public function profile(): Response
    {
        $user = Auth::user()->load(['role', 'branch']);

        return Inertia::render('reception/profile', [
            'user' => [
                'id'          => $user->id,
                'name'        => $user->name,
                'email'       => $user->email,
                'role'        => $user->role?->name,
                'branch_name' => $user->branch?->name,
                'branch_id'   => $user->branch_id,
                'created_at'  => $user->created_at?->format('Y.m.d'),
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'name'     => 'required|string|max:255',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $data = ['name' => $request->name];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return back()->with('success', 'Профайл шинэчлэгдлээ.');
    }
}
