<?php

namespace App\Http\Controllers\Reception;

use App\Exports\OrthoApplianceExport;
use App\Http\Controllers\Controller;
use App\Imports\OrthoApplianceImport;
use App\Models\Doctor;
use App\Models\OrthoApplianceRecord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OrthoApplianceController extends Controller
{
    private function orthodontists(?int $branchId = null)
    {
        return Doctor::where('is_active', true)
            ->where(fn ($q) => $q
                ->where('specialization', 'like', '%гажиг%')
                ->orWhere('specialization', 'like', '%Гажиг%')
                ->orWhere('specialization', 'like', '%ortho%')
            )
            ->where('specialization', 'not like', '%туслах%')
            ->where('specialization', 'not like', '%Туслах%')
            ->when($branchId, fn ($q) => $q->where(fn ($q2) => $q2
                ->where('branch_id', $branchId)
                ->orWhereHas('branches', fn ($q3) => $q3->where('branches.id', $branchId))
            ))
            ->orderBy('name')
            ->get();
    }

    private function buildDoctorData($doctors, $records): Collection
    {
        return $doctors->map(fn ($d) => [
            'id' => $d->id,
            'name' => $d->name,
            'specialization' => $d->specialization,
            'records' => ($records[$d->id] ?? collect())->map(fn ($r) => $this->formatRecord($r))->values(),
        ]);
    }

    public function index(): Response
    {
        $branchId = Auth::user()->branch_id;
        $doctors = $this->orthodontists($branchId);
        $records = OrthoApplianceRecord::whereIn('doctor_id', $doctors->pluck('id'))
            ->orderBy('last_name')->get()->groupBy('doctor_id');

        return Inertia::render('reception/ortho-appliances/index', [
            'doctors' => $this->buildDoctorData($doctors, $records),
        ]);
    }

    public function adminIndex(): Response
    {
        $doctors = $this->orthodontists();
        $records = OrthoApplianceRecord::whereIn('doctor_id', $doctors->pluck('id'))
            ->orderBy('last_name')->get()->groupBy('doctor_id');

        return Inertia::render('admin/ortho-appliances/index', [
            'doctors' => $this->buildDoctorData($doctors, $records),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'doctor_id' => 'required|exists:doctors,id',
            'appliance_type' => 'required|in:removable,fixed',
            'archive_code' => 'nullable|string|max:50',
            'card_number' => 'nullable|string|max:50',
            'register_number' => 'nullable|string|max:20',
            'last_name' => 'required|string|max:100',
            'first_name' => 'required|string|max:100',
            'phone' => 'nullable|string|max:50',
            'attached_date' => 'nullable|date',
            'removed_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        OrthoApplianceRecord::create(array_merge(
            $request->only('doctor_id', 'appliance_type', 'archive_code', 'card_number',
                'register_number', 'last_name', 'first_name', 'phone',
                'attached_date', 'removed_date', 'notes'),
            ['created_by' => Auth::user()->name]
        ));

        return back()->with('success', 'Бичлэг нэмэгдлээ.');
    }

    public function update(Request $request, OrthoApplianceRecord $record): RedirectResponse
    {
        $request->validate([
            'appliance_type' => 'sometimes|in:removable,fixed',
            'archive_code' => 'nullable|string|max:50',
            'card_number' => 'nullable|string|max:50',
            'register_number' => 'nullable|string|max:20',
            'last_name' => 'required|string|max:100',
            'first_name' => 'required|string|max:100',
            'phone' => 'nullable|string|max:50',
            'attached_date' => 'nullable|date',
            'removed_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $record->update($request->only(
            'appliance_type', 'archive_code', 'card_number', 'register_number',
            'last_name', 'first_name', 'phone', 'attached_date', 'removed_date', 'notes'
        ));

        return back()->with('success', 'Хадгалагдлаа.');
    }

    public function destroy(OrthoApplianceRecord $record): RedirectResponse
    {
        $record->delete();

        return back()->with('success', 'Бичлэг устгагдлаа.');
    }

    public function export(Request $request): BinaryFileResponse
    {
        $doctorId = $request->integer('doctor_id') ?: null;
        $branchId = Auth::user()->branch_id;
        $filename = $doctorId
            ? 'ortho-'.Doctor::find($doctorId)?->name.'-'.now()->format('Y-m-d').'.xlsx'
            : 'ortho-appliances-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(new OrthoApplianceExport($doctorId, $branchId), $filename);
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:5120',
            'doctor_id' => 'required|exists:doctors,id',
        ]);

        Excel::import(new OrthoApplianceImport($request->integer('doctor_id')), $request->file('file'));

        return back()->with('success', 'Excel файлаас бичлэгүүд импортлогдлоо.');
    }

    private function formatRecord(OrthoApplianceRecord $r): array
    {
        return [
            'id' => $r->id,
            'doctor_id' => $r->doctor_id,
            'appliance_type' => $r->appliance_type,
            'archive_code' => $r->archive_code ?? '',
            'card_number' => $r->card_number ?? '',
            'register_number' => $r->register_number ?? '',
            'last_name' => $r->last_name,
            'first_name' => $r->first_name,
            'phone' => $r->phone ?? '',
            'attached_date' => $r->attached_date?->format('Y-m-d') ?? '',
            'removed_date' => $r->removed_date?->format('Y-m-d') ?? '',
            'notes' => $r->notes ?? '',
            'is_active' => $r->removed_date === null,
        ];
    }
}
