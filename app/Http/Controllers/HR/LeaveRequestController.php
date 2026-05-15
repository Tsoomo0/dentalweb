<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\LeaveRequest;
use App\Models\Setting;
use App\Notifications\LeaveRequestDecision;
use App\Services\AuditService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class LeaveRequestController extends Controller
{
    public function index(): Response
    {
        $requests = LeaveRequest::with(['employee.position', 'employee.branch', 'replacement', 'reviewer'])
            ->latest()
            ->get()
            ->map(fn($r) => [
                'id'               => $r->id,
                'employee_name'    => $r->employee->full_name,
                'employee_number'  => $r->employee->employee_number,
                'photo_url'        => $r->employee->photo_url,
                'position'         => $r->employee->position?->name,
                'branch'           => $r->employee->branch?->name,
                'start_date'       => $r->start_date->toDateString(),
                'end_date'         => $r->end_date->toDateString(),
                'days'             => $r->days,
                'leave_type'       => $r->leave_type,
                'reason'           => $r->reason,
                'replacement'      => $r->replacement?->full_name,
                'status'           => $r->status,
                'rejection_reason' => $r->rejection_reason,
                'reviewed_by'      => $r->reviewer?->name,
                'reviewed_at'      => $r->reviewed_at?->toDateString(),
                'created_at'       => $r->created_at->toDateString(),
            ]);

        return Inertia::render('hr/leave-requests/index', [
            'requests' => $requests,
        ]);
    }

    public function approve(LeaveRequest $leaveRequest): RedirectResponse
    {
        if (!$leaveRequest->isPending()) {
            return back()->with('error', 'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.');
        }

        $leaveRequest->update([
            'status'      => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        $this->notifyEmployee($leaveRequest);

        $emp = $leaveRequest->employee?->full_name ?? '—';
        AuditService::log('approved', $leaveRequest, null, ['status' => 'approved'],
            "Чөлөөний хүсэлт зөвшөөрөв: {$emp} ({$leaveRequest->start_date} → {$leaveRequest->end_date})");

        return back()->with('success', 'Чөлөөний хүсэлт зөвшөөрөгдлөө.');
    }

    public function reject(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        if (!$leaveRequest->isPending()) {
            return back()->with('error', 'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.');
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $leaveRequest->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => Auth::id(),
            'reviewed_at'      => now(),
        ]);

        $this->notifyEmployee($leaveRequest);

        $emp = $leaveRequest->employee?->full_name ?? '—';
        AuditService::log('rejected', $leaveRequest, null, ['status' => 'rejected', 'reason' => $request->rejection_reason],
            "Чөлөөний хүсэлт татгалзав: {$emp}");

        return back()->with('success', 'Чөлөөний хүсэлт цуцлагдлаа.');
    }

    public function destroy(LeaveRequest $leaveRequest): RedirectResponse
    {
        $emp    = $leaveRequest->employee?->full_name ?? '—';
        $status = $leaveRequest->status;
        $period = $leaveRequest->start_date->toDateString() . ' → ' . $leaveRequest->end_date->toDateString();

        $leaveRequest->delete();

        AuditService::log('deleted', $leaveRequest, null, null,
            "Чөлөөний хүсэлт устгав: {$emp} ({$period}, төлөв: {$status})");

        return back()->with('success', 'Чөлөөний хүсэлт устгагдлаа.');
    }

    public function pdf(LeaveRequest $leaveRequest): HttpResponse
    {
        $leaveRequest->load(['employee.position', 'employee.branch', 'replacement', 'reviewer']);

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

        $pdf = Pdf::loadView('hr.leave-request-pdf', [
            'r'        => $leaveRequest,
            'logoPath' => $logoPath,
            'siteName' => $settings['site_name'] ?? 'Dental Clinic',
        ])->setPaper('a4', 'portrait');

        $name = $leaveRequest->employee->full_name . ' - Чөлөөний хүсэлт.pdf';

        return $pdf->download($name);
    }

    public function exportExcel(): HttpResponse
    {
        $requests = LeaveRequest::with(['employee.position', 'employee.branch', 'replacement', 'reviewer'])
            ->latest()->get();

        $html     = view('hr.leave-requests-excel', compact('requests'))->render();
        $filename = 'Чөлөөний хүсэлт.xls';
        $encoded  = rawurlencode($filename);

        return response("\xEF\xBB\xBF" . $html, 200, [
            'Content-Type'        => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename*=UTF-8''{$encoded}",
        ]);
    }

    private function notifyEmployee(LeaveRequest $leaveRequest): void
    {
        $leaveRequest->load('employee.position', 'employee.branch');
        $user = $leaveRequest->employee->user ?? null;
        if ($user) {
            $user->notify(new LeaveRequestDecision($leaveRequest));
        }
    }
}
