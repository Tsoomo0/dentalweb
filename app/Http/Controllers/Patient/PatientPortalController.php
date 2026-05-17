<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ConsentFormTemplate;
use App\Models\Doctor;
use App\Models\GeneralVisit;
use App\Models\HR\Employee;
use App\Models\OrthoVisit;
use App\Models\PatientConsentForm;
use App\Models\User;
use App\Notifications\ConsentFormSigned;
use App\Notifications\GeneralVisitSigned;
use App\Notifications\OrthoVisitSigned;
use App\Notifications\PatientAppointmentRequested;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PatientPortalController extends Controller
{
    public function dashboard(): Response
    {
        $user = Auth::user();
        $patient = $user->patient()->with([
            'treatmentRecords' => fn ($q) => $q->with('doctor')->orderByDesc('record_date')->limit(5),
        ])->first();

        $allAppointments = collect();
        $statusCounts = ['pending' => 0, 'confirmed' => 0, 'completed' => 0, 'cancelled' => 0];
        $monthlyCounts = [];
        $nextAppointment = null;
        $totalCharged = 0;
        $totalPaid = 0;

        if ($patient) {
            $phones = array_filter([$patient->phone, $patient->phone2]);
            $allAppointments = Appointment::where(function ($q) use ($patient, $phones) {
                $q->where('patient_id', $patient->id);
                foreach ($phones as $ph) {
                    $q->orWhere('patient_phone', $ph);
                }
            })
                ->with('doctor', 'branch')
                ->orderByDesc('appointment_date')
                ->get();

            $patient->setRelation('appointments', $allAppointments->take(5));

            // Status breakdown
            foreach ($allAppointments as $apt) {
                if (isset($statusCounts[$apt->status])) {
                    $statusCounts[$apt->status]++;
                }
            }

            // Monthly counts – last 6 months
            $now = now();
            for ($i = 5; $i >= 0; $i--) {
                $month = $now->copy()->subMonths($i);
                $key = $month->format('Y-m');
                $label = $month->locale('mn')->isoFormat('MMM');
                $count = $allAppointments->filter(
                    fn ($a) => $a->appointment_date && $a->appointment_date->format('Y-m') === $key
                )->count();
                $monthlyCounts[] = ['month' => $label, 'count' => $count];
            }

            // Next upcoming appointment (date+time aware — exclude already-past time slots)
            $nowTs = now();
            $todayStr = $nowTs->toDateString();
            $nowTime = $nowTs->format('H:i:s');

            $nextAppointment = $allAppointments
                ->filter(fn ($a) => in_array($a->status, ['pending', 'confirmed'])
                    && $a->appointment_date
                    && (
                        $a->appointment_date->format('Y-m-d') > $todayStr
                        || (
                            $a->appointment_date->format('Y-m-d') === $todayStr
                            && ($a->appointment_time === null || $a->appointment_time >= $nowTime)
                        )
                    ))
                ->sortBy(fn ($a) => $a->appointment_date->format('Y-m-d').($a->appointment_time ?? '00:00'))
                ->first();

            // Financials from treatment records
            $totalCharged = $patient->treatmentRecords->sum('amount_charged');
            $totalPaid = $patient->treatmentRecords->sum('paid_amount');
        }

        return Inertia::render('patient/dashboard', [
            'patient' => $patient,
            'status_counts' => $statusCounts,
            'monthly_counts' => $monthlyCounts,
            'next_appointment' => $nextAppointment ? [
                'id' => $nextAppointment->id,
                'appointment_date' => $nextAppointment->appointment_date?->format('Y-m-d'),
                'appointment_time' => $nextAppointment->appointment_time ? substr($nextAppointment->appointment_time, 0, 5) : null,
                'status' => $nextAppointment->status,
                'doctor' => $nextAppointment->doctor ? ['name' => $nextAppointment->doctor->name] : null,
                'branch' => $nextAppointment->branch ? ['name' => $nextAppointment->branch->name] : null,
            ] : null,
            'total_charged' => $totalCharged,
            'total_paid' => $totalPaid,
        ]);
    }

    public function profile(): Response
    {
        $patient = Auth::user()->patient;

        return Inertia::render('patient/profile', compact('patient'));
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $patient = Auth::user()->patient;

        $data = $request->validate([
            'last_name' => ['required', 'string', 'max:100'],
            'first_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:20'],
            'phone2' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'gender' => ['nullable', 'in:male,female,other'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        $patient->update($data);

        // Хэрэглэгчийн нэрийг шинэчлэх
        Auth::user()->update(['name' => $data['last_name'].' '.$data['first_name']]);

        return back()->with('success', 'Мэдээлэл шинэчлэгдлээ');
    }

    public function appointments(Request $request): Response
    {
        $patient = Auth::user()->patient;
        $statusFilter = $request->input('status', '');

        if (! $patient) {
            $appointments = null;
            $statusCounts = ['all' => 0, 'pending' => 0, 'confirmed' => 0, 'completed' => 0, 'cancelled' => 0];
        } else {
            $phones = array_filter([$patient->phone, $patient->phone2]);

            $base = Appointment::where(function ($q) use ($patient, $phones) {
                $q->where('patient_id', $patient->id);
                foreach ($phones as $ph) {
                    $q->orWhere('patient_phone', $ph);
                }
            });

            // Status counts for filter tabs
            $allRows = (clone $base)->get(['status']);
            $statusCounts = [
                'all' => $allRows->count(),
                'pending' => $allRows->where('status', 'pending')->count(),
                'confirmed' => $allRows->where('status', 'confirmed')->count(),
                'completed' => $allRows->where('status', 'completed')->count(),
                'cancelled' => $allRows->where('status', 'cancelled')->count(),
            ];

            $appointments = (clone $base)
                ->when($statusFilter, fn ($q) => $q->where('status', $statusFilter))
                ->with('doctor', 'branch')
                ->orderByDesc('appointment_date')
                ->orderByDesc('appointment_time')
                ->paginate(12)
                ->withQueryString();
        }

        $doctors = Doctor::where('is_active', true)->orderBy('name')->get(['id', 'name', 'specialization']);

        return Inertia::render('patient/appointments', [
            'patient' => $patient,
            'appointments' => $appointments,
            'doctors' => $doctors,
            'status_counts' => $statusCounts ?? ['all' => 0, 'pending' => 0, 'confirmed' => 0, 'completed' => 0, 'cancelled' => 0],
            'current_filter' => $statusFilter,
        ]);
    }

    public function appointmentsPoll(): JsonResponse
    {
        $patient = Auth::user()->patient;

        if (! $patient) {
            return response()->json(['appointments' => []]);
        }

        $phones = array_filter([$patient->phone, $patient->phone2]);
        $appointments = Appointment::where(function ($q) use ($patient, $phones) {
            $q->where('patient_id', $patient->id);
            foreach ($phones as $ph) {
                $q->orWhere('patient_phone', $ph);
            }
        })
            ->with('doctor', 'branch')
            ->orderByDesc('appointment_date')
            ->limit(50)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'appointment_number' => $a->appointment_number,
                'appointment_date' => $a->appointment_date?->format('Y-m-d') ?? '',
                'appointment_time' => $a->appointment_time ? substr($a->appointment_time, 0, 5) : '',
                'status' => $a->status,
                'type' => $a->type,
                'meet_link' => $a->meet_link,
                'payment_status' => $a->payment_status,
                'notes' => $a->notes,
                'doctor' => $a->doctor ? ['name' => $a->doctor->name] : null,
                'branch' => $a->branch ? ['name' => $a->branch->name] : null,
            ]);

        return response()->json(['appointments' => $appointments]);
    }

    public function requestAppointment(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $patient = $user->patient;

        $validated = $request->validate([
            'preferred_date' => ['required', 'date', 'after_or_equal:today'],
            'preferred_time' => ['nullable', 'string', 'max:10'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'service' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'preferred_date.required' => 'Хүссэн огноог оруулна уу',
            'preferred_date.after_or_equal' => 'Өнөөдөр буюу ирээдүйн огноо оруулна уу',
        ]);

        $patientName = $patient ? ($patient->last_name.' '.$patient->first_name) : $user->name;
        $patientPhone = $patient?->phone ?? '';

        // Pending appointment үүсгэнэ
        $doctor = $validated['doctor_id'] ? Doctor::with('branch')->find($validated['doctor_id']) : null;

        $appointment = Appointment::create([
            'appointment_number' => Appointment::generateNumber(),
            'patient_name' => $patientName,
            'patient_phone' => $patientPhone,
            'patient_email' => $user->email,
            'patient_id' => $patient?->id,
            'doctor_id' => $validated['doctor_id'] ?? null,
            'branch_id' => $doctor?->branch_id ?? $patient?->branch_id,
            'service' => $validated['service'] ?? null,
            'type' => 'in_person',
            'appointment_date' => $validated['preferred_date'],
            'appointment_time' => $validated['preferred_time'] ?? '09:00',
            'status' => 'pending',
            'payment_status' => 'free',
            'payment_amount' => 0,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user->name.' (Портал)',
        ]);

        // Ресепшн болон админд notification явуулна
        $branchId = $appointment->branch_id;
        $staffUsers = User::whereHas('role', fn ($q) => $q->whereIn('name', ['receptionist', 'admin']))
            ->when($branchId, fn ($q) => $q->where(fn ($q2) => $q2->where('branch_id', $branchId)->orWhereNull('branch_id')
            ))
            ->get();

        foreach ($staffUsers as $staff) {
            $staff->notify(new PatientAppointmentRequested(
                patientName: $patientName,
                patientPhone: $patientPhone,
                preferredDate: $validated['preferred_date'],
                preferredTime: $validated['preferred_time'] ?? null,
                notes: $validated['notes'] ?? null,
            ));
        }

        return back()->with('success', 'Цагийн хүсэлт амжилттай илгээгдлээ. Ресепшн баталгаажуулах болно.');
    }

    public function treatments(): Response
    {
        $patient = Auth::user()->patient;

        $records = $patient?->treatmentRecords()
            ->with(['doctor', 'leasingPlan'])
            ->orderByDesc('record_date')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'record_date' => $r->record_date?->toDateString(),
                'services' => $r->services ?? [],
                'treatment_type' => $r->treatment_type,
                'doctor' => $r->doctor ? ['name' => $r->doctor->name] : null,
                'amount_charged' => $r->amount_charged,
                'paid_amount' => $r->paid_amount,
                'payment_status' => $r->payment_status,
                'payment_method' => $r->payment_method,
                'paid_at' => $r->paid_at?->toDateString(),
                'discount_amount' => $r->discount_amount,
                'doctor_notes' => $r->doctor_notes,
                'leasing_plan_id' => $r->leasingPlan?->id,
                'leasing_paid_months' => $r->leasingPlan?->paid_months,
                'leasing_total_months' => $r->leasingPlan?->months,
                'leasing_monthly_amount' => $r->leasingPlan?->monthly_amount,
            ]) ?? collect();

        $totalCharged = $records->sum('amount_charged');
        $totalPaid = $records->sum('paid_amount');
        $totalPending = $records->filter(fn ($r) => in_array($r['payment_status'], ['sent', 'partial', 'leasing']))->sum(fn ($r) => ($r['amount_charged'] ?? 0) - ($r['paid_amount'] ?? 0));

        return Inertia::render('patient/treatments', [
            'records' => $records->values(),
            'total_charged' => $totalCharged,
            'total_paid' => $totalPaid,
            'total_pending' => $totalPending,
        ]);
    }

    public function consentForms(): Response
    {
        $patient = Auth::user()->patient;

        $allForms = $patient?->consentForms()->with('template')->get() ?? collect();

        $pendingForms = $allForms->whereNull('patient_signature')->values();
        $signedForms = $allForms->whereNotNull('patient_signature')->sortByDesc('signed_at')->values();

        return Inertia::render('patient/consent-forms', compact(
            'patient', 'pendingForms', 'signedForms'
        ));
    }

    public function storeConsent(Request $request): RedirectResponse
    {
        $patient = Auth::user()->patient;

        if (! $patient) {
            return back()->withErrors(['error' => 'Өвчтний карт олдсонгүй']);
        }

        $validated = $request->validate([
            'template_id' => ['required', 'exists:consent_form_templates,id'],
            'signer_name' => ['required', 'string', 'max:150'],
            'patient_signature' => ['required', 'string'],
        ], [
            'patient_signature.required' => 'Гарын үсэг зурна уу',
        ]);

        // Хэрэв ресепшнээс хүсэлт ирсэн pending record байвал update хийнэ
        $pending = PatientConsentForm::where('patient_id', $patient->id)
            ->where('template_id', $validated['template_id'])
            ->whereNull('patient_signature')
            ->first();

        if ($pending) {
            $pending->update([
                'signer_name' => $validated['signer_name'],
                'patient_signature' => $validated['patient_signature'],
                'signed_at' => now(),
            ]);
        } else {
            PatientConsentForm::create([
                'patient_id' => $patient->id,
                'template_id' => $validated['template_id'],
                'signer_name' => $validated['signer_name'],
                'patient_signature' => $validated['patient_signature'],
                'signed_at' => now(),
            ]);
        }

        // Ресепшн болон админ хэрэглэгчдэд notification явуулна
        $template = ConsentFormTemplate::find($validated['template_id']);
        if ($template) {
            $patientFullName = $patient->last_name.' '.$patient->first_name;
            $staffUsers = User::whereHas('role', fn ($q) => $q->whereIn('name', ['receptionist', 'admin']))
                ->when($patient->branch_id, fn ($q) => $q->where(fn ($q2) => $q2->where('branch_id', $patient->branch_id)->orWhereNull('branch_id')
                ))
                ->get();

            foreach ($staffUsers as $staff) {
                $staff->notify(new ConsentFormSigned(
                    patientName: $patientFullName,
                    templateTitle: $template->title,
                ));
            }
        }

        return back()->with('success', 'Зөвшөөрлийн маягт амжилттай гарын үсэг зурагдлаа');
    }

    public function orthoSignatures(): Response
    {
        $patient = Auth::user()->patient;
        [$pending, $signed] = $this->resolveOrthoVisitLists($patient);
        [$generalPending, $generalSigned] = $this->resolveGeneralVisitLists($patient);

        return Inertia::render('patient/ortho-signatures', compact('patient', 'pending', 'signed', 'generalPending', 'generalSigned'));
    }

    public function orthoSignaturesPoll(): JsonResponse
    {
        $patient = Auth::user()->patient;
        [$pending, $signed] = $this->resolveOrthoVisitLists($patient);
        [$generalPending, $generalSigned] = $this->resolveGeneralVisitLists($patient);

        return response()->json(compact('pending', 'signed', 'generalPending', 'generalSigned'));
    }

    private function resolveOrthoVisitLists(?object $patient): array
    {
        if (! $patient) {
            return [collect(), collect()];
        }

        $visits = OrthoVisit::where('patient_id', $patient->id)
            ->whereNotNull('data->signature_requested_at')
            ->with('doctor')
            ->orderByDesc('visit_date')
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'visit_date' => $v->visit_date?->toDateString(),
                'doctor_name' => $v->doctor?->name,
                'data' => $v->data ?? [],
            ]);

        $pending = $visits->filter(fn ($v) => empty($v['data']['patient_signature']))->values();
        $signed = $visits->filter(fn ($v) => ! empty($v['data']['patient_signature']))->values();

        return [$pending, $signed];
    }

    private function resolveGeneralVisitLists(?object $patient): array
    {
        if (! $patient) {
            return [collect(), collect()];
        }

        $visits = GeneralVisit::where('patient_id', $patient->id)
            ->whereNotNull('data->signature_requested_at')
            ->with('doctor')
            ->orderByDesc('visit_date')
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'visit_date' => $v->visit_date?->toDateString(),
                'doctor_name' => $v->doctor?->name,
                'data' => $v->data ?? [],
            ]);

        $pending = $visits->filter(fn ($v) => empty($v['data']['patient_signature']))->values();
        $signed = $visits->filter(fn ($v) => ! empty($v['data']['patient_signature']))->values();

        return [$pending, $signed];
    }

    public function signGeneralVisit(Request $request, GeneralVisit $visit): RedirectResponse
    {
        $patient = Auth::user()->patient;

        if (! $patient || $visit->patient_id !== $patient->id) {
            abort(403);
        }

        $validated = $request->validate([
            'signer_name' => ['required', 'string', 'max:150'],
            'patient_signature' => ['required', 'string'],
        ], [
            'patient_signature.required' => 'Гарын үсэг зурна уу',
        ]);

        $data = $visit->data ?? [];
        $data['patient_signature'] = $validated['patient_signature'];
        $data['patient_signer_name'] = $validated['signer_name'];
        $data['patient_signed_at'] = now()->toISOString();
        $visit->update(['data' => $data]);

        if ($visit->doctor_id) {
            $doctor = Doctor::find($visit->doctor_id);
            if ($doctor?->employee_id) {
                $emp = Employee::with('user')->find($doctor->employee_id);
                $emp?->user?->notify(new GeneralVisitSigned(
                    patientName: $patient->last_name.' '.$patient->first_name,
                    visitDate: $visit->visit_date?->format('Y-m-d') ?? '',
                    signerName: $validated['signer_name'],
                ));
            }
        }

        return back()->with('success', 'Гарын үсэг амжилттай хадгалагдлаа.');
    }

    public function signOrthoVisit(Request $request, OrthoVisit $visit): RedirectResponse
    {
        $patient = Auth::user()->patient;

        if (! $patient || $visit->patient_id !== $patient->id) {
            abort(403);
        }

        $validated = $request->validate([
            'signer_name' => ['required', 'string', 'max:150'],
            'patient_signature' => ['required', 'string'],
        ], [
            'patient_signature.required' => 'Гарын үсэг зурна уу',
        ]);

        $data = $visit->data ?? [];
        $data['patient_signature'] = $validated['patient_signature'];
        $data['patient_signer_name'] = $validated['signer_name'];
        $data['patient_signed_at'] = now()->toISOString();
        $visit->update(['data' => $data]);

        // Эмчид notification явуулна
        if ($visit->doctor_id) {
            $doctor = Doctor::find($visit->doctor_id);
            if ($doctor?->employee_id) {
                $emp = Employee::with('user')->find($doctor->employee_id);
                $emp?->user?->notify(new OrthoVisitSigned(
                    patientName: $patient->last_name.' '.$patient->first_name,
                    visitDate: $visit->visit_date?->format('Y-m-d') ?? '',
                    signerName: $validated['signer_name'],
                ));
            }
        }

        return back()->with('success', 'Гарын үсэг амжилттай хадгалагдлаа.');
    }

    public function changePassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'current_password.required' => 'Одоогийн нууц үгээ оруулна уу',
            'password.required' => 'Шинэ нууц үг оруулна уу',
            'password.confirmed' => 'Нууц үг таарахгүй байна',
        ]);

        $user = Auth::user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return back()->withErrors(['current_password' => 'Одоогийн нууц үг буруу байна']);
        }

        $user->update(['password' => Hash::make($data['password'])]);

        return back()->with('success', 'Нууц үг амжилттай солигдлоо');
    }
}
