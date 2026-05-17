<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search');

        $patients = Patient::query()
            ->when($search, fn ($q) => $q->where(fn ($q2) => $q2->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('patient_number', 'like', "%{$search}%")
                ->orWhere('register_number', 'like', "%{$search}%")
            ))
            ->withCount(['appointments', 'treatmentRecords'])
            ->with('branch:id,name')
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/patients/index', compact('patients', 'search'));
    }

    public function show(Patient $patient): Response
    {
        $patient->load([
            'appointments.doctor:id,name',
            'appointments.branch:id,name',
            'treatmentRecords.doctor:id,name',
            'treatmentRecords.leasingPlan',
            'medicalHistory',
            'consentForms.template',
            'orthoVisits.doctor:id,name',
            'generalVisits.doctor:id,name',
            'branch:id,name',
        ]);

        $appointments = $patient->appointments->sortByDesc('appointment_date')->map(fn ($a) => [
            'id' => $a->id,
            'appointment_number' => $a->appointment_number,
            'appointment_date' => $a->appointment_date?->toDateString(),
            'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : null,
            'status' => $a->status,
            'service' => $a->service,
            'type' => $a->type,
            'notes' => $a->notes,
            'doctor' => $a->doctor ? ['name' => $a->doctor->name] : null,
            'branch' => $a->branch ? ['name' => $a->branch->name] : null,
        ])->values();

        $treatmentRecords = $patient->treatmentRecords->sortByDesc('record_date')->map(fn ($r) => [
            'id' => $r->id,
            'record_date' => $r->record_date?->toDateString(),
            'services' => $r->services ?? [],
            'doctor_notes' => $r->doctor_notes,
            'amount_charged' => $r->amount_charged,
            'paid_amount' => $r->paid_amount,
            'payment_status' => $r->payment_status,
            'payment_method' => $r->payment_method,
            'doctor' => $r->doctor ? ['name' => $r->doctor->name] : null,
            'leasing_plan' => $r->leasingPlan ? [
                'months' => $r->leasingPlan->months,
                'paid_months' => $r->leasingPlan->paid_months,
                'monthly_amount' => $r->leasingPlan->monthly_amount,
                'total_amount' => $r->leasingPlan->total_amount,
            ] : null,
        ])->values();

        $consentForms = $patient->consentForms->map(fn ($cf) => [
            'id' => $cf->id,
            'template_id' => $cf->template_id,
            'signer_name' => $cf->signer_name,
            'signed_at' => $cf->signed_at?->format('Y-m-d H:i'),
            'patient_signature' => $cf->patient_signature,
            'guardian_name' => $cf->guardian_name,
            'guardian_signature' => $cf->guardian_signature,
            'template' => $cf->template ? [
                'code' => $cf->template->code,
                'title' => $cf->template->title,
                'category' => $cf->template->category,
                'content' => $cf->template->content,
            ] : null,
        ])->values();

        $orthoVisits = $patient->orthoVisits->map(fn ($v) => [
            'id' => $v->id,
            'visit_date' => $v->visit_date?->toDateString(),
            'data' => $v->data ?? [],
            'doctor' => $v->doctor ? ['name' => $v->doctor->name] : null,
            'created_at' => $v->created_at?->toDateString(),
        ])->values();

        $generalVisits = $patient->generalVisits->map(fn ($v) => [
            'id' => $v->id,
            'visit_date' => $v->visit_date?->toDateString(),
            'data' => $v->data ?? [],
            'doctor' => $v->doctor ? ['name' => $v->doctor->name] : null,
            'created_at' => $v->created_at?->toDateString(),
        ])->values();

        return Inertia::render('admin/patients/show', [
            'patient' => array_merge($patient->only([
                'id', 'patient_number', 'last_name', 'first_name',
                'gender', 'date_of_birth', 'register_number',
                'phone', 'phone2', 'email', 'address',
                'emergency_contact_name', 'emergency_contact_phone',
                'emergency_contact_relation', 'notes', 'created_at',
            ]), [
                'branch' => $patient->branch ? ['name' => $patient->branch->name] : null,
                'appointments' => $appointments,
                'treatment_records' => $treatmentRecords,
                'medical_history' => $patient->medicalHistory,
                'consent_forms' => $consentForms,
                'ortho_visits' => $orthoVisits,
                'general_visits' => $generalVisits,
            ]),
        ]);
    }
}
