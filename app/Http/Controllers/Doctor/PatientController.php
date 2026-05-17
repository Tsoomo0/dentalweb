<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ConsentFormTemplate;
use App\Models\GeneralVisit;
use App\Models\OrthoMedia;
use App\Models\OrthoVisit;
use App\Models\Patient;
use App\Models\TreatmentRecord;
use App\Models\User;
use App\Notifications\GeneralVisitSignatureRequested;
use App\Notifications\OrthoSignatureRequested;
use App\Notifications\TreatmentSentToReception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $doctor = auth('doctor')->user();
        $search = $request->input('search');
        $appointmentId = $request->input('appointment_id');

        // appointment_id өгсөн бол тухайн захиалгад patient_id байхгүй тохиолдолд автоматаар үүсгэж redirect хийнэ
        if ($appointmentId) {
            $apt = Appointment::find($appointmentId);
            if ($apt && ! $apt->patient_id) {
                $nameParts = explode(' ', trim($apt->patient_name ?? ''), 2);
                $patient = Patient::firstOrCreate(
                    ['phone' => $apt->patient_phone ?? ''],
                    [
                        'patient_number' => Patient::generateNumber(),
                        'last_name' => $nameParts[0] ?? '',
                        'first_name' => $nameParts[1] ?? '',
                        'email' => $apt->patient_email,
                        'created_by' => null,
                    ]
                );
                $apt->update(['patient_id' => $patient->id]);

                return redirect("/doctor/patients/{$patient->id}?appointment_id={$appointmentId}");
            }
            if ($apt && $apt->patient_id) {
                return redirect("/doctor/patients/{$apt->patient_id}?appointment_id={$appointmentId}");
            }
        }

        $patients = Patient::query()
            ->when($search, function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('patient_number', 'like', "%{$search}%");
            })
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        if ($search && $patients->total() === 1) {
            $patient = $patients->first();

            return redirect("/doctor/patients/{$patient->id}");
        }

        return Inertia::render('doctor/patients/index', [
            'patients' => $patients,
            'search' => $search,
            'appointment_id' => $appointmentId ? (int) $appointmentId : null,
        ]);
    }

    public function show(Request $request, Patient $patient)
    {
        $doctor = auth('doctor')->user();

        $patient->load([
            'medicalHistory',
            'orthoAssessment',
            'orthoVisits',
            'generalVisits',
            'orthoMedia',
            'consentForms.template',
            'treatmentRecords' => fn ($q) => $q->where('doctor_id', $doctor->id)
                ->with(['doctor', 'leasingPlan'])
                ->orderByDesc('record_date'),
            'appointments' => fn ($q) => $q->where('doctor_id', $doctor->id)
                ->orderByDesc('appointment_date')->limit(10),
        ]);

        $templates = ConsentFormTemplate::where('is_active', true)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get(['id', 'code', 'category', 'title']);

        return Inertia::render('doctor/patients/show', [
            'patient' => $patient,
            'templates' => $templates,
            'appointment_id' => $request->query('appointment_id') ? (int) $request->query('appointment_id') : null,
        ]);
    }

    public function storeTreatmentRecord(Request $request, Patient $patient)
    {
        $doctor = auth('doctor')->user();

        $validated = $request->validate([
            'appointment_id' => 'nullable|integer|exists:appointments,id',
            'services' => 'nullable|array',
            'services.*.name' => 'nullable|string|max:200',
            'services.*.price' => 'nullable|numeric|min:0',
            'doctor_notes' => 'nullable|string',
            'send_to_reception' => 'nullable|boolean',
        ]);

        $services = collect($validated['services'] ?? [])
            ->filter(fn ($s) => ! empty($s['name']))
            ->values()
            ->toArray();

        $total = collect($services)->sum(fn ($s) => (int) ($s['price'] ?? 0));

        $sendToReception = $request->boolean('send_to_reception');

        $record = TreatmentRecord::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_id' => $validated['appointment_id'] ?? null,
            'record_date' => today(),
            'services' => $services,
            'amount_charged' => $total,
            'doctor_notes' => $validated['doctor_notes'] ?? null,
            'payment_status' => $sendToReception ? 'sent' : null,
        ]);

        if ($sendToReception) {
            $this->notifyReception($patient, $doctor, $record);
        }

        $message = $sendToReception
            ? 'Эмчилгээний тэмдэглэл ресепшнрүү илгээгдлээ.'
            : 'Эмчилгээний тэмдэглэл хадгалагдлаа.';

        return back()->with('success', $message);
    }

    public function sendTreatmentRecord(Patient $patient, TreatmentRecord $record)
    {
        if ($record->patient_id !== $patient->id) {
            abort(403);
        }
        if ($record->doctor_id !== auth('doctor')->id()) {
            abort(403);
        }
        if ($record->payment_status !== null) {
            return back()->with('info', 'Аль хэдийн илгээгдсэн байна.');
        }
        $record->update(['payment_status' => 'sent']);

        $doctor = auth('doctor')->user();
        $this->notifyReception($patient, $doctor, $record);

        return back()->with('success', 'Ресепшнрүү илгээгдлээ.');
    }

    private function notifyReception(Patient $patient, $doctor, TreatmentRecord $record): void
    {
        $appointmentNumber = $record->appointment?->appointment_number;
        $notification = new TreatmentSentToReception(
            patientName: $patient->last_name.' '.$patient->first_name,
            doctorName: $doctor->name,
            amount: (int) $record->amount_charged,
            appointmentNumber: $appointmentNumber,
        );

        $staffUsers = User::whereHas('role', fn ($q) => $q->whereIn('name', ['receptionist', 'admin']))
            ->when($doctor->branch_id, fn ($q) => $q->where(fn ($q2) => $q2->where('branch_id', $doctor->branch_id)->orWhereNull('branch_id')
            ))
            ->get();

        foreach ($staffUsers as $staff) {
            $staff->notify($notification);
        }
    }

    public function destroyTreatmentRecord(Patient $patient, TreatmentRecord $record)
    {
        if ($record->patient_id !== $patient->id) {
            abort(403);
        }
        if ($record->doctor_id !== auth('doctor')->id()) {
            abort(403);
        }
        if (! in_array($record->payment_status, [null, 'sent'])) {
            return back()->with('error', 'Төлөгдсөн бичлэгийг устгах боломжгүй.');
        }
        $record->delete();

        return back()->with('success', 'Бичлэг устгагдлаа.');
    }

    public function updateMedical(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'has_heart_disease' => 'boolean',
            'has_diabetes' => 'boolean',
            'has_hypertension' => 'boolean',
            'has_hepatitis' => 'boolean',
            'has_bleeding_disorder' => 'boolean',
            'has_asthma' => 'boolean',
            'has_epilepsy' => 'boolean',
            'has_kidney_disease' => 'boolean',
            'has_hiv' => 'boolean',
            'has_mental_disorder' => 'boolean',
            'has_cancer' => 'boolean',
            'is_cancer_treatment' => 'boolean',
            'has_thyroid_disorder' => 'boolean',
            'has_anemia' => 'boolean',
            'takes_blood_thinners' => 'boolean',
            'has_tuberculosis' => 'boolean',
            'has_infectious_hepatitis' => 'boolean',
            'has_tonsils' => 'boolean',
            'is_pregnant' => 'boolean',
            'is_nursing' => 'boolean',
            'has_womens_condition' => 'boolean',
            'is_smoker' => 'boolean',
            'drinks_alcohol' => 'boolean',
            'other_conditions' => 'nullable|string',
            'organ_stones' => 'nullable|string',
            'allergy_penicillin' => 'boolean',
            'allergy_aspirin' => 'boolean',
            'allergy_latex' => 'boolean',
            'allergy_anesthetic' => 'boolean',
            'had_anesthetic_allergy' => 'boolean',
            'allergy_other' => 'nullable|string',
            'current_medications' => 'nullable|string',
            'special_ongoing_treatment' => 'nullable|string',
            'had_dental_complications' => 'boolean',
            'dental_complication_detail' => 'nullable|string',
            'previous_surgeries' => 'nullable|string',
            'previous_dental_treatments' => 'nullable|string',
            'last_checkup' => 'nullable|string',
            'previous_dental_clinics' => 'nullable|string',
        ]);

        $patient->medicalHistory()->updateOrCreate(
            ['patient_id' => $patient->id],
            $data
        );

        return back()->with('success', 'Өвчний түүх хадгалагдлаа.');
    }

    public function updateOrtho(Request $request, Patient $patient)
    {
        $data = $request->validate(['data' => 'nullable|array']);

        $patient->orthoAssessment()->updateOrCreate(
            ['patient_id' => $patient->id],
            ['data' => $data['data'] ?? []]
        );

        return back()->with('success', 'Гажиг засалын үнэлгээ хадгалагдлаа.');
    }

    /* ─── Ortho Visits (Ortho-08) ─────────────────────────────────────────── */

    public function storeOrthoVisit(Request $request, Patient $patient)
    {
        $doctor = auth('doctor')->user();
        $validated = $request->validate([
            'visit_date' => 'required|date',
            'data' => 'nullable|array',
        ]);

        $visitData = array_merge($validated['data'] ?? [], [
            'signature_requested_at' => now()->toISOString(),
        ]);

        $visit = OrthoVisit::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'visit_date' => $validated['visit_date'],
            'data' => $visitData,
        ]);

        if ($patient->user_id && $patient->user) {
            $patient->user->notify(new OrthoSignatureRequested(
                doctorName: $doctor->name,
                visitDate: $visit->visit_date?->format('Y-m-d') ?? now()->toDateString(),
                patientName: $patient->last_name.' '.$patient->first_name,
            ));
        }

        return back()->with('success', 'Үзлэгийн тэмдэглэл хадгалагдлаа.');
    }

    public function updateOrthoVisit(Request $request, Patient $patient, OrthoVisit $visit)
    {
        if ($visit->patient_id !== $patient->id) {
            abort(403);
        }
        $validated = $request->validate([
            'visit_date' => 'required|date',
            'data' => 'nullable|array',
        ]);

        $existingData = $visit->data ?? [];
        $newData = array_merge($existingData, $validated['data'] ?? [], [
            'signature_requested_at' => $existingData['signature_requested_at'] ?? now()->toISOString(),
        ]);
        $visit->update(['visit_date' => $validated['visit_date'], 'data' => $newData]);

        if ($patient->user_id && $patient->user) {
            $doctor = auth('doctor')->user();
            $patient->user->notify(new OrthoSignatureRequested(
                doctorName: $doctor->name,
                visitDate: $visit->visit_date?->format('Y-m-d') ?? now()->toDateString(),
                patientName: $patient->last_name.' '.$patient->first_name,
            ));
        }

        return back()->with('success', 'Үзлэгийн тэмдэглэл шинэчлэгдлээ.');
    }

    public function destroyOrthoVisit(Patient $patient, OrthoVisit $visit)
    {
        if ($visit->patient_id !== $patient->id) {
            abort(403);
        }
        $visit->delete();

        return back()->with('success', 'Үзлэг устгагдлаа.');
    }

    public function requestOrthoVisitSignature(Patient $patient, OrthoVisit $visit)
    {
        if ($visit->patient_id !== $patient->id) {
            abort(403);
        }

        $data = $visit->data ?? [];
        $data['signature_requested_at'] = now()->toISOString();
        $visit->update(['data' => $data]);

        // Өвчтний user акаунт руу notification явуулна
        if ($patient->user_id && $patient->user) {
            $doctor = auth('doctor')->user();
            $patient->user->notify(new OrthoSignatureRequested(
                doctorName: $doctor->name,
                visitDate: $visit->visit_date?->format('Y-m-d') ?? now()->toDateString(),
                patientName: $patient->last_name.' '.$patient->first_name,
            ));
        }

        return back()->with('success', 'Гарын үсгийн хүсэлт илгээгдлээ.');
    }

    /* ─── Ortho Media (X-ray / Before / After) ────────────────────────────── */

    public function uploadOrthoMedia(Request $request, Patient $patient)
    {
        $request->validate([
            'type' => 'required|in:xray,before,after',
            'files' => 'required|array|min:1|max:10',
            'files.*' => 'required|file|mimes:jpg,jpeg,png,gif,webp,bmp|max:10240',
        ]);

        $type = $request->input('type');
        $created = [];

        foreach ($request->file('files') as $file) {
            $path = $file->store("ortho/{$patient->id}/{$type}", 'public');
            $created[] = OrthoMedia::create([
                'patient_id' => $patient->id,
                'type' => $type,
                'file_path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

        return back()->with('success', count($created).' зураг амжилттай хадгалагдлаа.');
    }

    public function destroyOrthoMedia(Patient $patient, OrthoMedia $media)
    {
        if ($media->patient_id !== $patient->id) {
            abort(403);
        }
        Storage::disk('public')->delete($media->file_path);
        $media->delete();

        return back()->with('success', 'Зураг устгагдлаа.');
    }

    public function pollOrthoVisits(Patient $patient): JsonResponse
    {
        $visits = OrthoVisit::where('patient_id', $patient->id)
            ->orderByDesc('visit_date')
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'visit_date' => $v->visit_date?->toDateString(),
                'data' => $v->data ?? [],
            ]);

        return response()->json(['visits' => $visits]);
    }

    /* ─── General Visits ─────────────────────────────────────────────────── */

    public function storeGeneralVisit(Request $request, Patient $patient)
    {
        $doctor = auth('doctor')->user();
        $validated = $request->validate([
            'visit_date' => 'required|date',
            'data' => 'nullable|array',
        ]);

        $visitData = array_merge($validated['data'] ?? [], [
            'signature_requested_at' => now()->toISOString(),
        ]);

        $visit = GeneralVisit::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'visit_date' => $validated['visit_date'],
            'data' => $visitData,
        ]);

        if ($patient->user_id && $patient->user) {
            $patient->user->notify(new GeneralVisitSignatureRequested(
                doctorName: $doctor->name,
                visitDate: $visit->visit_date?->format('Y-m-d') ?? now()->toDateString(),
                patientName: $patient->last_name.' '.$patient->first_name,
            ));
        }

        return back()->with('success', 'Үзлэгийн тэмдэглэл хадгалагдлаа.');
    }

    public function updateGeneralVisit(Request $request, Patient $patient, GeneralVisit $visit)
    {
        if ($visit->patient_id !== $patient->id) {
            abort(403);
        }
        $validated = $request->validate([
            'visit_date' => 'required|date',
            'data' => 'nullable|array',
        ]);

        $existingData = $visit->data ?? [];
        $newData = array_merge($existingData, $validated['data'] ?? [], [
            'signature_requested_at' => $existingData['signature_requested_at'] ?? now()->toISOString(),
        ]);
        $visit->update(['visit_date' => $validated['visit_date'], 'data' => $newData]);

        if ($patient->user_id && $patient->user) {
            $doctor = auth('doctor')->user();
            $patient->user->notify(new GeneralVisitSignatureRequested(
                doctorName: $doctor->name,
                visitDate: $visit->visit_date?->format('Y-m-d') ?? now()->toDateString(),
                patientName: $patient->last_name.' '.$patient->first_name,
            ));
        }

        return back()->with('success', 'Үзлэгийн тэмдэглэл шинэчлэгдлээ.');
    }

    public function destroyGeneralVisit(Patient $patient, GeneralVisit $visit)
    {
        if ($visit->patient_id !== $patient->id) {
            abort(403);
        }
        $visit->delete();

        return back()->with('success', 'Үзлэг устгагдлаа.');
    }

    public function requestGeneralVisitSignature(Patient $patient, GeneralVisit $visit)
    {
        if ($visit->patient_id !== $patient->id) {
            abort(403);
        }

        $data = $visit->data ?? [];
        $data['signature_requested_at'] = now()->toISOString();
        $visit->update(['data' => $data]);

        if ($patient->user_id && $patient->user) {
            $doctor = auth('doctor')->user();
            $patient->user->notify(new GeneralVisitSignatureRequested(
                doctorName: $doctor->name,
                visitDate: $visit->visit_date?->format('Y-m-d') ?? now()->toDateString(),
                patientName: $patient->last_name.' '.$patient->first_name,
            ));
        }

        return back()->with('success', 'Гарын үсгийн хүсэлт илгээгдлээ.');
    }

    public function pollGeneralVisits(Patient $patient): JsonResponse
    {
        $visits = GeneralVisit::where('patient_id', $patient->id)
            ->orderByDesc('visit_date')
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'visit_date' => $v->visit_date?->toDateString(),
                'data' => $v->data ?? [],
            ]);

        return response()->json(['visits' => $visits]);
    }

    public function search(Request $request)
    {
        $q = $request->input('q', '');
        $patients = Patient::where('phone', 'like', "%{$q}%")
            ->orWhere('first_name', 'like', "%{$q}%")
            ->orWhere('last_name', 'like', "%{$q}%")
            ->orWhere('patient_number', 'like', "%{$q}%")
            ->limit(10)
            ->get(['id', 'patient_number', 'first_name', 'last_name', 'phone', 'date_of_birth']);

        return response()->json($patients);
    }
}
