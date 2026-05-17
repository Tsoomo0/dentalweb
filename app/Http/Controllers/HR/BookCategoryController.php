<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\BookCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BookCategoryController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'color' => 'nullable|string|max:50',
        ]);

        BookCategory::create([
            'name' => $request->name,
            'color' => $request->color ?? 'blue',
        ]);

        return back()->with('success', 'Ангилал нэмэгдлээ.');
    }

    public function update(Request $request, BookCategory $bookCategory): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'color' => 'nullable|string|max:50',
        ]);

        $bookCategory->update([
            'name' => $request->name,
            'color' => $request->color ?? 'blue',
        ]);

        return back()->with('success', 'Ангилал шинэчлэгдлээ.');
    }

    public function destroy(BookCategory $bookCategory): RedirectResponse
    {
        if ($bookCategory->books()->exists()) {
            return back()->with('error', 'Энэ ангилалд ном байгaa тул устгах боломжгүй.');
        }

        $bookCategory->delete();

        return back()->with('success', 'Ангилал устгагдлаа.');
    }
}
