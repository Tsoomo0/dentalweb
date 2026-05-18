<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\HR\Position;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PositionController extends Controller
{
    public function index(): Response
    {
        $positions = Position::withCount('employees')
            ->orderBy('name')
            ->get()
            ->map(fn (Position $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'portal' => $p->portal,
                'is_active' => $p->is_active,
                'employees_count' => $p->employees_count,
            ]);

        return Inertia::render('hr/positions/index', [
            'positions' => $positions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:positions,name',
            'portal' => 'required|in:doctor,reception,lab,staff,hr,admin',
        ]);

        Position::create([
            'name' => $request->name,
            'portal' => $request->portal,
            'is_active' => true,
        ]);

        return back()->with('success', 'Албан тушаал нэмэгдлээ.');
    }

    public function update(Request $request, Position $position): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:positions,name,'.$position->id,
            'portal' => 'required|in:doctor,reception,lab,staff,hr,admin',
        ]);

        $position->update([
            'name' => $request->name,
            'portal' => $request->portal,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Албан тушаал шинэчлэгдлээ.');
    }

    public function destroy(Position $position): RedirectResponse
    {
        if ($position->employees_count > 0) {
            return back()->with('error', 'Энэ тушаалтай ажилтан байгаа тул устгах боломжгүй.');
        }

        $position->delete();

        return back()->with('success', 'Албан тушаал устгагдлаа.');
    }
}
