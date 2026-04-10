<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubTreatment;
use App\Models\Treatment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SubTreatmentController extends Controller
{
    public function store(Request $request, Treatment $treatment): RedirectResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price_min' => 'nullable|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0',
            'duration_min' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $treatment->subTreatments()->create([
            'title' => $request->title,
            'description' => $request->description,
            'price_min' => $request->price_min,
            'price_max' => $request->price_max,
            'duration_min' => $request->duration_min,
            'is_active' => $request->boolean('is_active', true),
            'order' => $treatment->subTreatments()->max('order') + 1,
        ]);

        return back()->with('success', 'Дэд эмчилгээ нэмэгдлээ.');
    }

    public function update(Request $request, Treatment $treatment, SubTreatment $subTreatment): RedirectResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price_min' => 'nullable|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0',
            'duration_min' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
        ]);

        $subTreatment->update($request->only('title', 'description', 'price_min', 'price_max', 'duration_min', 'is_active'));

        return back()->with('success', 'Дэд эмчилгээ шинэчлэгдлээ.');
    }

    public function destroy(Treatment $treatment, SubTreatment $subTreatment): RedirectResponse
    {
        $subTreatment->delete();

        return back()->with('success', 'Дэд эмчилгээ устгагдлаа.');
    }
}
