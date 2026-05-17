<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\HrDocumentCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DocumentCategoryController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:hr_document_categories,name',
            'color' => 'required|string|in:blue,violet,emerald,orange,sky,green,red,pink,yellow,gray',
        ]);

        HrDocumentCategory::create([
            'name' => $request->name,
            'color' => $request->color,
            'order' => HrDocumentCategory::max('order') + 1,
        ]);

        return back()->with('success', 'Ангилал нэмэгдлээ.');
    }

    public function update(Request $request, HrDocumentCategory $documentCategory): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:hr_document_categories,name,'.$documentCategory->id,
            'color' => 'required|string|in:blue,violet,emerald,orange,sky,green,red,pink,yellow,gray',
        ]);

        $documentCategory->update([
            'name' => $request->name,
            'color' => $request->color,
        ]);

        return back()->with('success', 'Ангилал шинэчлэгдлээ.');
    }

    public function destroy(HrDocumentCategory $documentCategory): RedirectResponse
    {
        if ($documentCategory->documents()->exists()) {
            return back()->with('error', 'Энэ ангилалд баримт бичиг байгаа тул устгах боломжгүй.');
        }

        $documentCategory->delete();

        return back()->with('success', 'Ангилал устгагдлаа.');
    }
}
