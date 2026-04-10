<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    public function index(): Response
    {
        $branches = Branch::orderBy('order')->get()->map(function ($b) {
            return array_merge($b->toArray(), [
                'image_url' => $b->image ? Storage::url($b->image) : null,
            ]);
        });

        return Inertia::render('admin/branches/index', [
            'branches'       => $branches,
            'total_doctors'  => Branch::where('is_active', true)->sum('doctor_count'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/branches/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'         => 'required|string|max:255',
            'type'         => 'required|in:тов,төрөлжсөн,клиник,24/7',
            'address'      => 'nullable|string|max:500',
            'phone'        => 'nullable|string|max:50',
            'image'        => 'nullable|image|max:5120',
            'description'  => 'nullable|string',
            'doctor_count' => 'nullable|integer|min:0',
            'is_featured'  => 'boolean',
            'is_active'    => 'boolean',
        ]);

        $data = $request->only('name', 'type', 'address', 'phone', 'description', 'doctor_count', 'is_featured', 'is_active');
        $data['order'] = Branch::max('order') + 1;

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('branches', 'public');
        }

        Branch::create($data);

        return redirect()->route('admin.branches.index')->with('success', 'Салбар амжилттай нэмэгдлээ.');
    }

    public function edit(Branch $branch): Response
    {
        $branch->image_url = $branch->image ? Storage::url($branch->image) : null;

        return Inertia::render('admin/branches/edit', [
            'branch' => $branch,
        ]);
    }

    public function update(Request $request, Branch $branch): RedirectResponse
    {
        $request->validate([
            'name'         => 'required|string|max:255',
            'type'         => 'required|in:тов,төрөлжсөн,клиник,24/7',
            'address'      => 'nullable|string|max:500',
            'phone'        => 'nullable|string|max:50',
            'image'        => 'nullable|image|max:5120',
            'description'  => 'nullable|string',
            'doctor_count' => 'nullable|integer|min:0',
            'is_featured'  => 'boolean',
            'is_active'    => 'boolean',
        ]);

        $data = $request->only('name', 'type', 'address', 'phone', 'description', 'doctor_count', 'is_featured', 'is_active');

        if ($request->hasFile('image')) {
            if ($branch->image) Storage::disk('public')->delete($branch->image);
            $data['image'] = $request->file('image')->store('branches', 'public');
        }

        $branch->update($data);

        return redirect()->route('admin.branches.index')->with('success', 'Салбар шинэчлэгдлээ.');
    }

    public function destroy(Branch $branch): RedirectResponse
    {
        if ($branch->image) Storage::disk('public')->delete($branch->image);
        $branch->delete();

        return back()->with('success', 'Салбар устгагдлаа.');
    }
}
