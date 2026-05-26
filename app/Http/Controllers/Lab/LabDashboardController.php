<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Models\LabOrder;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class LabDashboardController extends Controller
{
    public function dashboard(): Response
    {
        $user = Auth::user();
        $branch = $user->branch;

        // Лаб портал нь зөвхөн "Кутикул лаб"-ын ажлуудыг харна
        // (бусад лабын ажлууд гадны лаб бөгөөд lab portal-аар явахгүй)
        $base = fn () => LabOrder::where('lab_name', 'Кутикул лаб');

        $stats = [
            'active'         => (clone $base())->where('is_completed', false)->count(),
            'completed'      => (clone $base())->where('is_completed', true)->count(),
            'overdue'        => (clone $base())
                ->where('is_completed', false)
                ->whereNotNull('pickup_date')
                ->whereDate('pickup_date', '<', now()->toDateString())
                ->count(),
            'arriving_today' => (clone $base())
                ->where('is_completed', false)
                ->whereDate('pickup_date', now()->toDateString())
                ->count(),
        ];

        $recent = (clone $base())
            ->with(['branch', 'doctor'])
            ->where('is_completed', false)
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn ($o) => [
                'id'                 => $o->id,
                'order_date'         => $o->order_date?->toDateString(),
                'lab_name'           => $o->lab_name,
                'patient_first_name' => $o->patient_first_name,
                'patient_last_name'  => $o->patient_last_name,
                'doctor_name'        => $o->doctor?->name,
                'work_description'   => $o->work_description,
                'pickup_date'        => $o->pickup_date?->toDateString(),
            ]);

        return Inertia::render('lab/dashboard', [
            'branch' => $branch ? [
                'id'      => $branch->id,
                'name'    => $branch->name,
                'address' => $branch->address,
                'phone'   => $branch->phone,
            ] : null,
            'stats'  => $stats,
            'recent' => $recent,
        ]);
    }
}
