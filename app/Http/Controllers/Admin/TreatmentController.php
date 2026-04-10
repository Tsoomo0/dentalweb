<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Treatment;
use App\Models\TreatmentCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class TreatmentController extends Controller
{
    public function index(): Response
    {
        $categories = TreatmentCategory::orderBy('order')->get();
        $treatments = Treatment::with(['category', 'subTreatments'])
            ->orderBy('order')
            ->get()
            ->map(function ($treatment) {
                return array_merge($treatment->toArray(), [
                    'image_url' => $treatment->image ? Storage::url($treatment->image) : null,
                ]);
            });

        return Inertia::render('admin/treatments/index', [
            'categories' => $categories,
            'treatments' => $treatments,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/treatments/create', [
            'categories' => TreatmentCategory::orderBy('order')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'treatment_category_id' => 'required|exists:treatment_categories,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'price_min' => 'nullable|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0',
            'duration_min' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $data = $request->only('treatment_category_id', 'title', 'description', 'price_min', 'price_max', 'duration_min', 'is_active');
        $data['order'] = Treatment::max('order') + 1;

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('treatments', 'public');
        }

        $treatment = Treatment::create($data);

        foreach ($request->input('sub_treatments', []) as $i => $sub) {
            if (!empty($sub['title'])) {
                $treatment->subTreatments()->create([
                    'title'        => $sub['title'],
                    'description'  => $sub['description'] ?? null,
                    'price_min'    => $sub['price_min'] ?? null,
                    'price_max'    => $sub['price_max'] ?? null,
                    'duration_min' => $sub['duration_min'] ?? null,
                    'is_active'    => filter_var($sub['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
                    'order'        => $i,
                ]);
            }
        }

        $message = $treatment->subTreatments()->count() > 0
            ? 'Эмчилгээ болон дэд эмчилгээнүүд амжилттай нэмэгдлээ.'
            : 'Эмчилгээ нэмэгдлээ! Дэд эмчилгээ нэмэх боломжтой.';

        return redirect()->route('admin.treatments.edit', $treatment)->with('success', $message);
    }

    public function edit(Treatment $treatment): Response
    {
        $treatment->load('subTreatments');
        $treatment->image_url = $treatment->image ? Storage::url($treatment->image) : null;

        return Inertia::render('admin/treatments/edit', [
            'treatment' => $treatment,
            'categories' => TreatmentCategory::orderBy('order')->get(),
        ]);
    }

    public function update(Request $request, Treatment $treatment): RedirectResponse
    {
        $request->validate([
            'treatment_category_id' => 'required|exists:treatment_categories,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'price_min' => 'nullable|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0',
            'duration_min' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $data = $request->only('treatment_category_id', 'title', 'description', 'price_min', 'price_max', 'duration_min', 'is_active');

        if ($request->hasFile('image')) {
            if ($treatment->image) {
                Storage::disk('public')->delete($treatment->image);
            }
            $data['image'] = $request->file('image')->store('treatments', 'public');
        }

        $treatment->update($data);

        return redirect()->route('admin.treatments.index')->with('success', 'Эмчилгээ шинэчлэгдлээ.');
    }

    public function destroy(Treatment $treatment): RedirectResponse
    {
        if ($treatment->image) {
            Storage::disk('public')->delete($treatment->image);
        }
        $treatment->delete();

        return back()->with('success', 'Эмчилгээ устгагдлаа.');
    }
}
