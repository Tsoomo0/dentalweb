<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GalleryItem;
use App\Models\TreatmentCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class GalleryController extends Controller
{
    public function index(): Response
    {
        $items = GalleryItem::with('category')
            ->orderBy('order')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($item) => array_merge($item->toArray(), [
                'before_url'    => Storage::url($item->before_image),
                'after_url'     => Storage::url($item->after_image),
                'category_name' => $item->category?->name,
            ]));

        return Inertia::render('admin/gallery/index', [
            'items'      => $items,
            'categories' => TreatmentCategory::orderBy('order')->get(['id', 'name']),
            'stats'      => [
                'total'    => GalleryItem::count(),
                'active'   => GalleryItem::where('is_active', true)->count(),
                'featured' => GalleryItem::where('is_featured', true)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/gallery/create', [
            'categories' => TreatmentCategory::orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'category_id'  => 'nullable|exists:treatment_categories,id',
            'before_image' => 'required|image|max:8192',
            'after_image'  => 'required|image|max:8192',
            'is_featured'  => 'boolean',
            'is_active'    => 'boolean',
        ]);

        GalleryItem::create([
            'title'        => $request->title,
            'description'  => $request->description,
            'category_id'  => $request->category_id,
            'before_image' => $request->file('before_image')->store('gallery', 'public'),
            'after_image'  => $request->file('after_image')->store('gallery', 'public'),
            'is_featured'  => $request->boolean('is_featured'),
            'is_active'    => $request->boolean('is_active', true),
            'order'        => GalleryItem::max('order') + 1,
        ]);

        return redirect()->route('admin.gallery.index')->with('success', 'Үр дүн амжилттай нэмэгдлээ.');
    }

    public function edit(GalleryItem $gallery): Response
    {
        $gallery->before_url = Storage::url($gallery->before_image);
        $gallery->after_url  = Storage::url($gallery->after_image);

        return Inertia::render('admin/gallery/edit', [
            'item'       => $gallery,
            'categories' => TreatmentCategory::orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, GalleryItem $gallery): RedirectResponse
    {
        $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'category_id'  => 'nullable|exists:treatment_categories,id',
            'before_image' => 'nullable|image|max:8192',
            'after_image'  => 'nullable|image|max:8192',
            'is_featured'  => 'boolean',
            'is_active'    => 'boolean',
        ]);

        $data = [
            'title'       => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'is_featured' => $request->boolean('is_featured'),
            'is_active'   => $request->boolean('is_active'),
        ];

        if ($request->hasFile('before_image')) {
            Storage::disk('public')->delete($gallery->before_image);
            $data['before_image'] = $request->file('before_image')->store('gallery', 'public');
        }

        if ($request->hasFile('after_image')) {
            Storage::disk('public')->delete($gallery->after_image);
            $data['after_image'] = $request->file('after_image')->store('gallery', 'public');
        }

        $gallery->update($data);

        return redirect()->route('admin.gallery.index')->with('success', 'Үр дүн амжилттай шинэчлэгдлээ.');
    }

    public function destroy(GalleryItem $gallery): RedirectResponse
    {
        Storage::disk('public')->delete($gallery->before_image);
        Storage::disk('public')->delete($gallery->after_image);
        $gallery->delete();

        return back()->with('success', 'Үр дүн устгагдлаа.');
    }
}
