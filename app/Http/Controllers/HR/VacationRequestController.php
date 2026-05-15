<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use App\Models\HR\VacationRequest;
use App\Models\Setting;
use App\Notifications\VacationRequestDecision;
use App\Services\AuditService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class VacationRequestController extends Controller
{
    public function balanceIndex(): Response
    {
        $usedThisYear = VacationRequest::where('status', 'approved')
            ->whereYear('start_date', now()->year)
            ->get()
            ->groupBy('employee_id')
            ->map(fn($reqs) => $reqs->sum(fn($r) => $r->days));

        $employees = Employee::with(['position', 'branch'])
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->orderBy('last_name')
            ->get()
            ->map(function ($e) use ($usedThisYear) {
                $used      = $usedThisYear[$e->id] ?? 0;
                $allowed   = $e->vacation_days + $e->vacation_extra_days;
                $remaining = max(0, $allowed - $used);
                return [
                    'id'                  => $e->id,
                    'name'                => $e->full_name,
                    'employee_number'     => $e->employee_number,
                    'photo_url'           => $e->photo_url,
                    'position'            => $e->position?->name,
                    'branch'              => $e->branch?->name,
                    'ndsh_years'          => $e->ndsh_years,
                    'vacation_days'       => $e->vacation_days,
                    'vacation_extra_days' => $e->vacation_extra_days,
                    'used'                => $used,
                    'allowed'             => $allowed,
                    'remaining'           => $remaining,
                ];
            });

        return Inertia::render('hr/vacation-requests/balance', [
            'employees' => $employees,
            'year'      => now()->year,
        ]);
    }

    public function index(): Response
    {
        $requests = VacationRequest::with(['employee.position', 'employee.branch', 'replacement', 'reviewer'])
            ->latest()
            ->get();

        // Энэ оны зөвшөөрөгдсөн өдрүүд ажилтнаар нь бүлэглэнэ
        $usedThisYear = VacationRequest::where('status', 'approved')
            ->whereYear('start_date', now()->year)
            ->get()
            ->groupBy('employee_id')
            ->map(fn($reqs) => $reqs->sum(fn($r) => $r->days));

        $data = $requests->map(function ($r) use ($usedThisYear) {
            $used      = $usedThisYear[$r->employee_id] ?? 0;
            $allowed   = $r->employee->vacation_days + $r->employee->vacation_extra_days;
            $remaining = max(0, $allowed - $used);

            return [
                'id'                          => $r->id,
                'employee_id'                 => $r->employee_id,
                'employee_name'               => $r->employee->full_name,
                'employee_number'             => $r->employee->employee_number,
                'photo_url'                   => $r->employee->photo_url,
                'position'                    => $r->employee->position?->name,
                'branch'                      => $r->employee->branch?->name,
                'start_date'                  => $r->start_date->toDateString(),
                'end_date'                    => $r->end_date->toDateString(),
                'days'                        => $r->days,
                'replacement'                 => $r->replacement?->full_name,
                'location_during_leave'       => $r->location_during_leave,
                'emergency_phone'             => $r->emergency_phone,
                'had_annual_leave_this_year'  => $r->had_annual_leave_this_year,
                'reason'                      => $r->reason,
                'status'                      => $r->status,
                'rejection_reason'            => $r->rejection_reason,
                'reviewed_by'                 => $r->reviewer?->name,
                'reviewed_at'                 => $r->reviewed_at?->toDateString(),
                'created_at'                  => $r->created_at->toDateString(),
                // Амралтын үлдэгдэл
                'vacation_days'               => $r->employee->vacation_days,
                'vacation_extra_days'         => $r->employee->vacation_extra_days,
                'used_days_this_year'         => $used,
                'remaining_days'              => $remaining,
            ];
        });

        return Inertia::render('hr/vacation-requests/index', [
            'requests' => $data,
        ]);
    }

    public function approve(VacationRequest $vacationRequest): RedirectResponse
    {
        if (!$vacationRequest->isPending()) {
            return back()->with('error', 'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.');
        }

        $vacationRequest->update([
            'status'      => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        $this->notifyEmployee($vacationRequest);

        $emp = $vacationRequest->employee?->full_name ?? '—';
        AuditService::log('approved', $vacationRequest, null, ['status' => 'approved'],
            "Ээлжийн амралт зөвшөөрөв: {$emp} ({$vacationRequest->start_date} → {$vacationRequest->end_date})");

        return back()->with('success', 'Ээлжийн амралтын хүсэлт зөвшөөрөгдлөө.');
    }

    public function reject(Request $request, VacationRequest $vacationRequest): RedirectResponse
    {
        if (!$vacationRequest->isPending()) {
            return back()->with('error', 'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.');
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $vacationRequest->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => Auth::id(),
            'reviewed_at'      => now(),
        ]);

        $this->notifyEmployee($vacationRequest);

        $emp = $vacationRequest->employee?->full_name ?? '—';
        AuditService::log('rejected', $vacationRequest, null, ['status' => 'rejected', 'reason' => $request->rejection_reason],
            "Ээлжийн амралт татгалзав: {$emp}");

        return back()->with('success', 'Ээлжийн амралтын хүсэлт цуцлагдлаа.');
    }

    public function destroy(VacationRequest $vacationRequest): RedirectResponse
    {
        $emp    = $vacationRequest->employee?->full_name ?? '—';
        $status = $vacationRequest->status;
        $period = $vacationRequest->start_date->toDateString() . ' → ' . $vacationRequest->end_date->toDateString();

        $vacationRequest->delete();

        AuditService::log('deleted', $vacationRequest, null, null,
            "Ээлжийн амралтын хүсэлт устгав: {$emp} ({$period}, төлөв: {$status})");

        return back()->with('success', 'Ээлжийн амралтын хүсэлт устгагдлаа.');
    }

    public function updateBalance(Request $request, Employee $employee): RedirectResponse
    {
        $data = $request->validate([
            'vacation_extra_days' => 'required|integer|min:0|max:365',
        ]);

        $employee->update($data);

        return back()->with('success', 'Нэмэгдэл хоног хадгалагдлаа.');
    }

    public function pdf(VacationRequest $vacationRequest): HttpResponse
    {
        $vacationRequest->load(['employee.position', 'employee.branch', 'replacement', 'reviewer']);

        $settings = Cache::remember('inertia_site_settings', 3600, fn () =>
            Setting::whereIn('key', ['site_name', 'site_logo'])->pluck('value', 'key')->toArray()
        );

        $logoPath = null;
        if (!empty($settings['site_logo'])) {
            $path = public_path('storage/' . ltrim($settings['site_logo'], '/'));
            if (file_exists($path)) {
                $logoPath = 'data:image/' . pathinfo($path, PATHINFO_EXTENSION) . ';base64,' . base64_encode(file_get_contents($path));
            }
        }

        $usedThisYear = VacationRequest::where('status', 'approved')
            ->where('employee_id', $vacationRequest->employee_id)
            ->whereYear('start_date', now()->year)
            ->get()
            ->sum(fn($r) => $r->days);

        $emp       = $vacationRequest->employee;
        $allowed   = $emp->vacation_days + $emp->vacation_extra_days;
        $remaining = max(0, $allowed - $usedThisYear);

        $pdf = Pdf::loadView('hr.vacation-request-pdf', [
            'r'         => $vacationRequest,
            'logoPath'  => $logoPath,
            'siteName'  => $settings['site_name'] ?? 'Dental Clinic',
            'allowed'   => $allowed,
            'used'      => $usedThisYear,
            'remaining' => $remaining,
        ])->setPaper('a4', 'portrait');

        $name = $vacationRequest->employee->full_name . ' - Ээлжийн амралт.pdf';

        return $pdf->download($name);
    }

    public function exportExcel(): HttpResponse
    {
        $requests = VacationRequest::with(['employee.position', 'employee.branch', 'replacement', 'reviewer'])
            ->latest()->get();

        $html     = view('hr.vacation-requests-excel', compact('requests'))->render();
        $filename = 'Ээлжийн амралтын хүсэлт.xls';
        $encoded  = rawurlencode($filename);

        return response("\xEF\xBB\xBF" . $html, 200, [
            'Content-Type'        => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename*=UTF-8''{$encoded}",
        ]);
    }

    private function notifyEmployee(VacationRequest $vacationRequest): void
    {
        $vacationRequest->load('employee.position', 'employee.branch');
        $user = $vacationRequest->employee->user ?? null;
        if ($user) {
            $user->notify(new VacationRequestDecision($vacationRequest));
        }
    }
}
