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

        // Лаб бүх салбарын захиалгыг харна
        $base = fn () => LabOrder::query();

        $stats = [
            'active'            => (clone $base())->where('is_completed', false)->count(),
            'completed'         => (clone $base())->where('is_completed', true)->count(),
            'total_due'         => (int) (clone $base())->where('is_completed', false)->sum('amount_due'),
            'total_paid'        => (int) (clone $base())->where('is_completed', false)->sum('amount_paid'),
            'overdue'           => (clone $base())
                ->where('is_completed', false)
                ->whereNotNull('pickup_date')
                ->whereDate('pickup_date', '<', now()->toDateString())
                ->count(),
            'arriving_today'    => (clone $base())
                ->where('is_completed', false)
                ->whereDate('pickup_date', now()->toDateString())
                ->count(),
        ];
        $stats['total_outstanding'] = max(0, $stats['total_due'] - $stats['total_paid']);

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
                'outstanding'        => $o->outstanding_amount,
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
