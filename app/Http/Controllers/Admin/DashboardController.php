<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Treatment;
use App\Models\TreatmentCategory;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'treatments_total'   => Treatment::count(),
                'treatments_active'  => Treatment::where('is_active', true)->count(),
                'categories_total'   => TreatmentCategory::count(),
                'users_total'        => User::count(),
            ],
            'recent_treatments' => Treatment::with('category')
                ->latest()
                ->take(5)
                ->get(['id', 'title', 'treatment_category_id', 'price_min', 'price_max', 'is_active', 'created_at']),
        ]);
    }
}
