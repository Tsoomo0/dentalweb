<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\ReceptionBonusEntry;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReceptionBonusController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            return redirect()->route('portal.select');
        }

        // Ресепшн ажил гүйцэтгэдэг ажилтан үзнэ:
        // - position.name дотор "ресепш" агуулсан (үндсэн ресепшн)
        // - ЭСВЭЛ employee.extra_portals дотор 'reception' (сувилагч мөн ресепшн хийдэг гэх мэт)
        $position = $employee->position?->name ?? '';
        $extras = $employee->extra_portals ?? [];
        $isPrimaryReception = mb_stripos($position, 'ресепш') !== false;
        $isExtraReception = is_array($extras) && in_array('reception', $extras, true);
        if (! $isPrimaryReception && ! $isExtraReception) {
            return redirect()->route('portal.select');
        }

        $entries = ReceptionBonusEntry::with('run')
            ->where('employee_id', $employee->id)
            ->where('is_sent', true)
            ->orderByDesc('bonus_run_id')
            ->get()
            ->filter(fn ($e) => $e->run !== null)
            ->map(fn ($e) => [
                'id' => $e->id,
                'run_id' => $e->bonus_run_id,
                'run_title' => $e->run->title,
                'half_label' => $e->run->half_label,
                'year' => $e->run->year,
                'month' => $e->run->month,
                'half' => $e->run->half,
                'registrations' => $e->registrations,
                'calls_received' => $e->calls_received,
                'call_reminders' => $e->call_reminders,
                'complaints' => $e->complaints,
                'compliments' => $e->compliments,
                'hubspot_regs' => $e->hubspot_regs,
                'payments' => $e->payments,
                'total_amount' => $e->total_amount,
            ]);

        return Inertia::render('my/reception-bonus', [
            'employee' => [
                'full_name' => $employee->full_name,
                'employee_number' => $employee->employee_number,
                'position' => $employee->position?->name,
            ],
            'entries' => $entries,
            'criteria' => ReceptionBonusEntry::CRITERIA,
        ]);
    }
}
