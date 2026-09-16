<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lab\LabCategory;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Админ тал — сургалтын ангилал (Керамик, CAD/CAM гэх мэт). */
class LabCategoryController extends Controller
{
    protected function rules(?int $id = null): array
    {
        return [
            'name'        => 'required|string|max:120',
            'description' => 'nullable|string|max:255',
            'color'       => 'required|in:'.implode(',', LabCategory::COLORS),
            'icon'        => 'required|in:'.implode(',', LabCategory::ICONS),
            'is_active'   => 'boolean',
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $category = LabCategory::create([
            ...$data,
            'is_active' => $request->boolean('is_active', true),
            'order'     => (int) LabCategory::max('order') + 1,
        ]);

        AuditService::log('created', $category, null, ['name' => $category->name], 'Сургалтын ангилал нэмэв: '.$category->name);

        return back()->with('success', 'Ангилал үүслээ.');
    }

    public function update(Request $request, LabCategory $labCategory): RedirectResponse
    {
        $data = $request->validate($this->rules($labCategory->id));
        $old  = $labCategory->only(['name', 'color', 'is_active']);

        $labCategory->update([
            ...$data,
            'is_active' => $request->boolean('is_active'),
        ]);

        AuditService::log('updated', $labCategory, $old, $labCategory->only(['name', 'color', 'is_active']), 'Сургалтын ангилал зассан: '.$labCategory->name);

        return back()->with('success', 'Ангилал шинэчлэгдлээ.');
    }

    /**
     * Ангилал устгахад доторх сургалтууд УСТАХГҮЙ — зөвхөн ангилалгүй болно
     * (FK нь nullOnDelete). Ингэснээр санамсаргүй устгал ажлыг үрэгдүүлэхгүй.
     */
    public function destroy(LabCategory $labCategory): RedirectResponse
    {
        $name  = $labCategory->name;
        $count = $labCategory->courses()->count();

        $labCategory->delete();

        AuditService::log('deleted', null, ['name' => $name], null, 'Сургалтын ангилал устгав: '.$name);

        return back()->with('success', $count > 0
            ? "Ангилал устлаа. {$count} сургалт ангилалгүй болов."
            : 'Ангилал устлаа.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer|exists:lab_categories,id',
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $i => $id) {
                LabCategory::whereKey($id)->update(['order' => $i + 1]);
            }
        });

        return back();
    }
}
