<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FaqController extends Controller
{
    public function index(): Response
    {
        $faqs = Faq::orderBy('order')->orderByDesc('created_at')->get();

        return Inertia::render('admin/Faqs/Index', [
            'faqs'  => $faqs,
            'stats' => [
                'total'    => $faqs->count(),
                'active'   => $faqs->where('is_active', true)->count(),
                'inactive' => $faqs->where('is_active', false)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/Faqs/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'question'  => 'required|string|max:500',
            'answer'    => 'required|string',
            'category'  => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        Faq::create([
            'question'  => $request->question,
            'answer'    => $request->answer,
            'category'  => $request->category,
            'is_active' => $request->boolean('is_active', true),
            'order'     => Faq::max('order') + 1,
        ]);

        return redirect()->route('admin.faqs.index')->with('success', 'Асуулт амжилттай нэмэгдлээ.');
    }

    public function edit(Faq $faq): Response
    {
        return Inertia::render('admin/Faqs/Edit', [
            'faq' => $faq,
        ]);
    }

    public function update(Request $request, Faq $faq): RedirectResponse
    {
        $request->validate([
            'question'  => 'required|string|max:500',
            'answer'    => 'required|string',
            'category'  => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $faq->update([
            'question'  => $request->question,
            'answer'    => $request->answer,
            'category'  => $request->category,
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('admin.faqs.index')->with('success', 'Асуулт амжилттай шинэчлэгдлээ.');
    }

    public function destroy(Faq $faq): RedirectResponse
    {
        $faq->delete();

        return back()->with('success', 'Асуулт устгагдлаа.');
    }

    public function toggle(Faq $faq): RedirectResponse
    {
        $faq->update(['is_active' => !$faq->is_active]);

        return back()->with('success', $faq->is_active ? 'Асуулт идэвхжлээ.' : 'Асуулт идэвхгүй боллоо.');
    }
}
