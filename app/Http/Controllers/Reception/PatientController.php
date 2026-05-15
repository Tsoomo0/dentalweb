<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\PatientMedicalHistory;
use App\Models\PatientOrthoAssessment;
use App\Models\ConsentFormTemplate;
use App\Models\PatientConsentForm;
use App\Notifications\ConsentFormSigned;
use App\Notifications\ConsentRequestSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $search   = $request->input('search');
        $branchId = Auth::user()->branch_id;

        $patients = Patient::query()
            ->when($branchId, fn($q) => $q->where(fn($q2) =>
                $q2->where('branch_id', $branchId)->orWhereNull('branch_id')
            ))
            ->when($search, function ($q) use ($search) {
                $q->where(fn($q2) => $q2
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('patient_number', 'like', "%{$search}%")
                    ->orWhere('register_number', 'like', "%{$search}%")
                );
            })
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('reception/patients/index', [
            'patients' => $patients,
            'search'   => $search,
        ]);
    }

    public function create()
    {
        $templates = ConsentFormTemplate::where('is_active', true)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get(['id', 'category', 'title']);

        return Inertia::render('reception/patients/create', compact('templates'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'last_name'                  => 'required|string|max:100',
            'first_name'                 => 'required|string|max:100',
            'gender'                     => 'nullable|in:male,female,other',
            'date_of_birth'              => 'nullable|date',
            'register_number'            => 'nullable|string|max:20',
            'phone'                      => 'required|string|max:20',
            'phone2'                     => 'nullable|string|max:20',
            'email'                      => 'nullable|email|max:150',
            'address'                    => 'nullable|string',
            'emergency_contact_name'     => 'nullable|string|max:100',
            'emergency_contact_phone'    => 'nullable|string|max:20',
            'emergency_contact_relation' => 'nullable|string|max:50',
            'notes'                      => 'nullable|string',
            'medical'                    => 'nullable|array',
            'consent_template_ids'       => 'nullable|array',
            'consent_template_ids.*'     => 'integer|exists:consent_form_templates,id',
        ]);

        $patient = Patient::create([
            'patient_number'             => Patient::generateNumber(),
            'last_name'                  => $validated['last_name'],
            'first_name'                 => $validated['first_name'],
            'gender'                     => $validated['gender'] ?? null,
            'date_of_birth'              => $validated['date_of_birth'] ?? null,
            'register_number'            => $validated['register_number'] ?? null,
            'phone'                      => $validated['phone'],
            'phone2'                     => $validated['phone2'] ?? null,
            'email'                      => $validated['email'] ?? null,
            'address'                    => $validated['address'] ?? null,
            'emergency_contact_name'     => $validated['emergency_contact_name'] ?? null,
            'emergency_contact_phone'    => $validated['emergency_contact_phone'] ?? null,
            'emergency_contact_relation' => $validated['emergency_contact_relation'] ?? null,
            'notes'                      => $validated['notes'] ?? null,
            'branch_id'                  => Auth::user()->branch_id,
            'created_by'                 => Auth::id(),
        ]);

        if (!empty($validated['medical'])) {
            PatientMedicalHistory::create(array_merge(
                ['patient_id' => $patient->id, 'updated_by' => Auth::id()],
                $validated['medical']
            ));
        }

        foreach ($validated['consent_template_ids'] ?? [] as $templateId) {
            PatientConsentForm::create([
                'patient_id'  => $patient->id,
                'template_id' => $templateId,
                'signer_name' => $patient->last_name . ' ' . $patient->first_name,
                'created_by'  => Auth::id(),
            ]);
        }

        return redirect()->route('reception.patients.show', $patient)
            ->with('success', 'Өвчтөн амжилттай бүртгэгдлээ.');
    }

    public function show(Patient $patient)
    {
        $branchId = Auth::user()->branch_id;
        if ($branchId && $patient->branch_id !== null && $patient->branch_id !== $branchId) {
            abort(403, 'Энэ өвчтөн өөр салбарт хамаарна.');
        }

        $patient->load([
            'medicalHistory',
            'orthoAssessment',
            'consentForms.template',
            'appointments.doctor',
            'treatmentRecords.doctor',
            'treatmentRecords.leasingPlan.installments',
        ]);

        $templates = ConsentFormTemplate::where('is_active', true)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get(['id', 'code', 'category', 'title', 'content']);

        $signedIds  = $patient->consentForms->whereNotNull('patient_signature')->pluck('template_id')->unique()->toArray();
        $pendingIds = $patient->consentForms->whereNull('patient_signature')->pluck('template_id')->unique()->toArray();

        // Эмчилгээний бичлэгүүдийг бүрэн мэдээлэлтэй явуулна
        $treatmentRecords = $patient->treatmentRecords->map(fn($r) => [
            'id'             => $r->id,
            'services'       => $r->services ?? [],
            'doctor_notes'   => $r->doctor_notes,
            'amount_charged' => $r->amount_charged,
            'paid_amount'    => $r->paid_amount,
            'payment_status' => $r->payment_status,
            'payment_method' => $r->payment_method,
            'record_date'    => $r->record_date?->toDateString(),
            'paid_at'        => $r->paid_at?->toDateString(),
            'doctor'         => $r->doctor ? ['id' => $r->doctor->id, 'name' => $r->doctor->name] : null,
            'leasing_plan'   => $r->leasingPlan ? [
                'total_amount'             => $r->leasingPlan->total_amount,
                'months'                   => $r->leasingPlan->months,
                'monthly_amount'           => $r->leasingPlan->monthly_amount,
                'paid_months'              => $r->leasingPlan->paid_months,
                'last_installment_paid_at' => $r->leasingPlan->installments
                    ->whereNotNull('paid_at')->sortByDesc('paid_at')->first()?->paid_at?->toDateString(),
            ] : null,
        ]);

        $appointments = $patient->appointments->sortByDesc('appointment_date')->map(fn($a) => [
            'id'                   => $a->id,
            'appointment_number'   => $a->appointment_number,
            'appointment_date'     => $a->appointment_date?->toDateString(),
            'appointment_time'     => $a->appointment_time,
            'appointment_time_end' => $a->appointment_time_end,
            'status'               => $a->status,
            'service'              => $a->service,
            'type'                 => $a->type,
            'notes'                => $a->notes,
            'payment_status'       => $a->payment_status,
            'payment_amount'       => $a->payment_amount,
            'doctor'               => $a->doctor ? ['id' => $a->doctor->id, 'name' => $a->doctor->name] : null,
        ])->values();

        return Inertia::render('reception/patients/show', [
            'patient'          => array_merge($patient->toArray(), [
                'treatment_records' => $treatmentRecords,
                'appointments'      => $appointments,
            ]),
            'templates'        => $templates,
            'signedIds'        => $signedIds,
            'pendingIds'       => $pendingIds,
        ]);
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'last_name'                  => 'required|string|max:100',
            'first_name'                 => 'required|string|max:100',
            'gender'                     => 'nullable|in:male,female,other',
            'date_of_birth'              => 'nullable|date',
            'register_number'            => 'nullable|string|max:20',
            'phone'                      => 'required|string|max:20',
            'phone2'                     => 'nullable|string|max:20',
            'email'                      => 'nullable|email|max:150',
            'address'                    => 'nullable|string',
            'emergency_contact_name'     => 'nullable|string|max:100',
            'emergency_contact_phone'    => 'nullable|string|max:20',
            'emergency_contact_relation' => 'nullable|string|max:50',
            'notes'                      => 'nullable|string',
        ]);

        $patient->update($validated);

        return back()->with('success', 'Мэдээлэл шинэчлэгдлээ.');
    }

    public function updateMedical(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'has_heart_disease'        => 'boolean',
            'has_diabetes'             => 'boolean',
            'has_hypertension'         => 'boolean',
            'has_hepatitis'            => 'boolean',
            'has_bleeding_disorder'    => 'boolean',
            'has_asthma'               => 'boolean',
            'has_epilepsy'             => 'boolean',
            'has_kidney_disease'       => 'boolean',
            'has_hiv'                  => 'boolean',
            'has_mental_disorder'      => 'boolean',
            'has_cancer'               => 'boolean',
            'is_cancer_treatment'      => 'boolean',
            'has_thyroid_disorder'     => 'boolean',
            'has_anemia'               => 'boolean',
            'takes_blood_thinners'     => 'boolean',
            'has_tuberculosis'         => 'boolean',
            'has_infectious_hepatitis' => 'boolean',
            'has_tonsils'              => 'boolean',
            'is_pregnant'              => 'boolean',
            'is_nursing'               => 'boolean',
            'has_womens_condition'     => 'boolean',
            'is_smoker'                => 'boolean',
            'drinks_alcohol'           => 'boolean',
            'other_conditions'         => 'nullable|string',
            'organ_stones'             => 'nullable|string',
            'allergy_penicillin'       => 'boolean',
            'allergy_aspirin'          => 'boolean',
            'allergy_latex'            => 'boolean',
            'allergy_anesthetic'       => 'boolean',
            'had_anesthetic_allergy'   => 'boolean',
            'allergy_other'            => 'nullable|string',
            'current_medications'      => 'nullable|string',
            'special_ongoing_treatment'=> 'nullable|string',
            'had_dental_complications' => 'boolean',
            'dental_complication_detail' => 'nullable|string',
            'previous_surgeries'       => 'nullable|string',
            'previous_dental_treatments' => 'nullable|string',
            'last_checkup'             => 'nullable|string',
            'previous_dental_clinics'  => 'nullable|string',
        ]);

        $patient->medicalHistory()->updateOrCreate(
            ['patient_id' => $patient->id],
            array_merge($data, ['updated_by' => Auth::id()])
        );

        return back()->with('success', 'Өвчний түүх хадгалагдлаа.');
    }

    public function updateOrtho(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'data' => 'nullable|array',
        ]);

        $patient->orthoAssessment()->updateOrCreate(
            ['patient_id' => $patient->id],
            ['data' => $data['data'] ?? [], 'created_by' => Auth::id()]
        );

        return back()->with('success', 'Гажиг заслын үнэлгээ хадгалагдлаа.');
    }

    public function storeConsent(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'template_id'        => 'required|exists:consent_form_templates,id',
            'signer_name'        => 'required|string|max:150',
            'patient_signature'  => 'required|string',
            'guardian_name'      => 'nullable|string|max:150',
            'guardian_signature' => 'nullable|string',
        ]);

        PatientConsentForm::create([
            'patient_id'        => $patient->id,
            'template_id'       => $validated['template_id'],
            'signer_name'       => $validated['signer_name'],
            'patient_signature' => $validated['patient_signature'],
            'guardian_name'     => $validated['guardian_name'] ?? null,
            'guardian_signature'=> $validated['guardian_signature'] ?? null,
            'signed_at'         => now(),
            'created_by'        => Auth::id(),
        ]);

        return back()->with('success', 'Зөвшөөрлийн хуудас хадгалагдлаа.');
    }

    public function requestConsent(Patient $patient, ConsentFormTemplate $template)
    {
        $exists = PatientConsentForm::where('patient_id', $patient->id)
            ->where('template_id', $template->id)
            ->exists();

        if ($exists) {
            return back()->withErrors(['consent' => 'Маягт аль хэдийн бүртгэгдсэн байна']);
        }

        if (!$patient->user_id) {
            return back()->withErrors(['consent' => 'Өвчтөнд нэвтрэх эрх олгоогүй байна. Эхлээд нэвтрэх эрх олгоно уу.']);
        }

        PatientConsentForm::create([
            'patient_id'  => $patient->id,
            'template_id' => $template->id,
            'signer_name' => $patient->last_name . ' ' . $patient->first_name,
            'created_by'  => Auth::id(),
        ]);

        // user_id check дээр аль хэдийн баталгаажсан тул шууд notify хийнэ
        $patientUser = $patient->user;
        if ($patientUser) {
            $patientUser->notify(new ConsentRequestSent(
                templateTitle: $template->title,
                receptionName: Auth::user()->name,
                patientName:   $patient->last_name . ' ' . $patient->first_name,
            ));
        }

        return back()->with('success', 'Гарын үсгийн хүсэлт илгээгдлээ. Өвчтөн нэвтрэн зурна.');
    }

    public function consentDetail(Patient $patient, ConsentFormTemplate $template)
    {
        return Inertia::render('reception/patients/consent', [
            'patient'  => $patient,
            'template' => $template,
        ]);
    }

    public function search(Request $request)
    {
        $q        = $request->input('q', '');
        $branchId = Auth::user()->branch_id;

        $patients = Patient::query()
            ->when($branchId, fn($qb) => $qb->where(fn($qb2) =>
                $qb2->where('branch_id', $branchId)->orWhereNull('branch_id')
            ))
            ->where(fn($qb) => $qb
                ->where('phone', 'like', "%{$q}%")
                ->orWhere('first_name', 'like', "%{$q}%")
                ->orWhere('last_name', 'like', "%{$q}%")
                ->orWhere('patient_number', 'like', "%{$q}%")
            )
            ->limit(10)
            ->get(['id', 'patient_number', 'first_name', 'last_name', 'phone', 'date_of_birth']);

        return response()->json($patients);
    }
}
