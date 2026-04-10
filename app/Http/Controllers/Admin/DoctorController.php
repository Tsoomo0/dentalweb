<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Doctor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DoctorController extends Controller
{
    public function index(): Response
    {
        $doctors = Doctor::with('branch')
            ->orderBy('order')
            ->get()
            ->map(fn($d) => array_merge($d->toArray(), [
                'photo_url' => $d->photo ? Storage::url($d->photo) : null,
            ]));

        return Inertia::render('admin/doctors/index', [
            'doctors'  => $doctors,
            'branches' => Branch::orderBy('order')->get(['id', 'name']),
            'stats'    => [
                'total'  => Doctor::count(),
                'active' => Doctor::where('is_active', true)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/doctors/create', [
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'branch_id'        => 'required|exists:branches,id',
            'name'             => 'required|string|max:255',
            'specialization'   => 'nullable|string|max:255',
            'degree'           => 'nullable|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'experiences'      => 'nullable|array',
            'experiences.*.year'        => 'nullable|string|max:50',
            'experiences.*.title'       => 'required_with:experiences|string|max:255',
            'experiences.*.institution' => 'nullable|string|max:255',
            'photo'            => 'nullable|image|max:5120',
            'description'      => 'nullable|string',
            'phone'            => 'nullable|string|max:50',
            'email'            => 'nullable|email|max:255',
            'is_active'        => 'boolean',
        ]);

        $data = $request->only('branch_id', 'name', 'specialization', 'degree', 'experience_years', 'experiences', 'description', 'phone', 'email', 'is_active');
        $data['order'] = Doctor::max('order') + 1;

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('doctors', 'public');
        }

        Doctor::create($data);

        return redirect()->route('admin.doctors.index')->with('success', 'Эмч амжилттай нэмэгдлээ.');
    }

    public function edit(Doctor $doctor): Response
    {
        $doctor->photo_url = $doctor->photo ? Storage::url($doctor->photo) : null;

        return Inertia::render('admin/doctors/edit', [
            'doctor'   => $doctor,
            'branches' => Branch::where('is_active', true)->orderBy('order')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Doctor $doctor): RedirectResponse
    {
        $request->validate([
            'branch_id'        => 'required|exists:branches,id',
            'name'             => 'required|string|max:255',
            'specialization'   => 'nullable|string|max:255',
            'degree'           => 'nullable|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'experiences'      => 'nullable|array',
            'experiences.*.year'        => 'nullable|string|max:50',
            'experiences.*.title'       => 'required_with:experiences|string|max:255',
            'experiences.*.institution' => 'nullable|string|max:255',
            'photo'            => 'nullable|image|max:5120',
            'description'      => 'nullable|string',
            'phone'            => 'nullable|string|max:50',
            'email'            => 'nullable|email|max:255',
            'is_active'        => 'boolean',
        ]);

        $data = $request->only('branch_id', 'name', 'specialization', 'degree', 'experience_years', 'experiences', 'description', 'phone', 'email', 'is_active');

        if ($request->hasFile('photo')) {
            if ($doctor->photo) Storage::disk('public')->delete($doctor->photo);
            $data['photo'] = $request->file('photo')->store('doctors', 'public');
        }

        $doctor->update($data);

        return redirect()->route('admin.doctors.index')->with('success', 'Эмчийн мэдээлэл шинэчлэгдлээ.');
    }

    public function destroy(Doctor $doctor): RedirectResponse
    {
        if ($doctor->photo) Storage::disk('public')->delete($doctor->photo);
        $doctor->delete();

        return back()->with('success', 'Эмч устгагдлаа.');
    }
}
