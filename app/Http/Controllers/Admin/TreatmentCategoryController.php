<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TreatmentCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TreatmentCategoryController extends Controller
{
    public function index(): Response
    {
        $categories = TreatmentCategory::withCount('treatments')->orderBy('order')->get();

        return Inertia::render('admin/treatment-categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:50',
        ]);

        TreatmentCategory::create([
            'name' => $request->name,
            'icon' => $request->icon,
            'order' => TreatmentCategory::max('order') + 1,
        ]);

        return back()->with('success', 'Ангилал амжилттай нэмэгдлээ.');
    }

    public function update(Request $request, TreatmentCategory $treatmentCategory): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $treatmentCategory->update($request->only('name', 'icon', 'is_active'));

        return back()->with('success', 'Ангилал шинэчлэгдлээ.');
    }

    public function destroy(TreatmentCategory $treatmentCategory): RedirectResponse
    {
        $treatmentCategory->delete();

        return back()->with('success', 'Ангилал устгагдлаа.');
    }
}
