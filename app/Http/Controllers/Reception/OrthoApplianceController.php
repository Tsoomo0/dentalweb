<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\OrthoApplianceRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class OrthoApplianceController extends Controller
{
    private function orthodontists()
    {
        return Doctor::where('is_active', true)
            ->where(fn($q) => $q
                ->where('specialization', 'like', '%гажиг%')
                ->orWhere('specialization', 'like', '%Гажиг%')
                ->orWhere('specialization', 'like', '%ortho%')
            )
            ->orderBy('name')
            ->get();
    }

    public function index(): Response
    {
        $doctors = $this->orthodontists();

        $records = OrthoApplianceRecord::whereIn('doctor_id', $doctors->pluck('id'))
            ->orderBy('doctor_id')
            ->orderBy('last_name')
            ->get()
            ->groupBy('doctor_id');

        $data = $doctors->map(fn($d) => [
            'id'             => $d->id,
            'name'           => $d->name,
            'specialization' => $d->specialization,
            'records'        => ($records[$d->id] ?? collect())->map(fn($r) => $this->formatRecord($r))->values(),
        ]);

        return Inertia::render('reception/ortho-appliances/index', [
            'doctors' => $data,
        ]);
    }

    public function adminIndex(): Response
    {
        $doctors = $this->orthodontists();

        $records = OrthoApplianceRecord::whereIn('doctor_id', $doctors->pluck('id'))
            ->orderBy('doctor_id')
            ->orderBy('last_name')
            ->get()
            ->groupBy('doctor_id');

        $data = $doctors->map(fn($d) => [
            'id'             => $d->id,
            'name'           => $d->name,
            'specialization' => $d->specialization,
            'records'        => ($records[$d->id] ?? collect())->map(fn($r) => $this->formatRecord($r))->values(),
        ]);

        return Inertia::render('admin/ortho-appliances/index', [
            'doctors' => $data,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'doctor_id'       => 'required|exists:doctors,id',
            'archive_code'    => 'nullable|string|max:50',
            'card_number'     => 'nullable|string|max:50',
            'register_number' => 'nullable|string|max:20',
            'last_name'       => 'required|string|max:100',
            'first_name'      => 'required|string|max:100',
            'phone'           => 'nullable|string|max:50',
            'attached_date'   => 'nullable|date',
            'removed_date'    => 'nullable|date|after_or_equal:attached_date',
            'notes'           => 'nullable|string',
        ]);

        OrthoApplianceRecord::create(array_merge(
            $request->only('doctor_id', 'archive_code', 'card_number', 'register_number',
                           'last_name', 'first_name', 'phone', 'attached_date', 'removed_date', 'notes'),
            ['created_by' => Auth::user()->name]
        ));

        return back()->with('success', 'Бичлэг нэмэгдлээ.');
    }

    public function update(Request $request, OrthoApplianceRecord $record): RedirectResponse
    {
        $request->validate([
            'archive_code'    => 'nullable|string|max:50',
            'card_number'     => 'nullable|string|max:50',
            'register_number' => 'nullable|string|max:20',
            'last_name'       => 'required|string|max:100',
            'first_name'      => 'required|string|max:100',
            'phone'           => 'nullable|string|max:50',
            'attached_date'   => 'nullable|date',
            'removed_date'    => 'nullable|date|after_or_equal:attached_date',
            'notes'           => 'nullable|string',
        ]);

        $record->update($request->only(
            'archive_code', 'card_number', 'register_number',
            'last_name', 'first_name', 'phone',
            'attached_date', 'removed_date', 'notes'
        ));

        return back()->with('success', 'Бичлэг шинэчлэгдлээ.');
    }

    public function destroy(OrthoApplianceRecord $record): RedirectResponse
    {
        $record->delete();
        return back()->with('success', 'Бичлэг устгагдлаа.');
    }

    private function formatRecord(OrthoApplianceRecord $r): array
    {
        return [
            'id'              => $r->id,
            'doctor_id'       => $r->doctor_id,
            'archive_code'    => $r->archive_code,
            'card_number'     => $r->card_number,
            'register_number' => $r->register_number,
            'last_name'       => $r->last_name,
            'first_name'      => $r->first_name,
            'phone'           => $r->phone,
            'attached_date'   => $r->attached_date?->format('Y-m-d'),
            'removed_date'    => $r->removed_date?->format('Y-m-d'),
            'notes'           => $r->notes,
            'is_active'       => $r->removed_date === null,
        ];
    }
}
