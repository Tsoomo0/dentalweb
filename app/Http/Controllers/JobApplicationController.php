<?php

namespace App\Http\Controllers;

use App\Models\HR\Position;
use App\Models\JobApplication;
use App\Models\User;
use App\Notifications\NewJobApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Throwable;

class JobApplicationController extends Controller
{
    /** Нэг утаснаас дахин анкет илгээхийг хориглох хугацаа (секунд) */
    private const RESUBMIT_COOLDOWN = 60;

    public function index()
    {
        return Inertia::render('job-application', [
            'positions' => Position::where('is_active', true)
                ->orderBy('name')
                ->pluck('name')
                ->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            // 1. Үндсэн мэдээлэл
            'last_name' => 'required|string|max:100',
            'first_name' => 'required|string|max:100',
            'family_name' => 'nullable|string|max:100',
            'gender' => 'nullable|string|max:20',
            'birth_city' => 'nullable|string|max:100',
            'birth_date' => 'nullable|date',
            'register_no' => 'nullable|string|max:20',
            'has_insurance' => 'boolean',
            'has_health_insurance' => 'boolean',
            'address' => 'nullable|string|max:500',
            'has_driving_license' => 'boolean',
            'driving_class' => 'nullable|string|max:20',
            'has_car' => 'boolean',
            'phone_home' => 'nullable|string|max:20',
            'phone_mobile' => 'required|string|max:20',
            'email' => 'nullable|email|max:150',
            'desired_position' => 'required|string|max:150',

            // 2. Боловсрол
            'education' => 'nullable|array',
            'education.*' => 'array',
            'professional_training' => 'nullable|array',
            'professional_training.*' => 'array',

            // 3. Ажлын туршлага
            'total_work_years' => 'nullable|string|max:50',
            'unverified_work_years' => 'nullable|string|max:50',
            'employment_status' => 'nullable|string|max:100',
            'work_experience' => 'nullable|array',
            'work_experience.*' => 'array',

            // 4. Ур чадвар
            'skills_languages' => 'nullable|array',
            'skills_computer' => 'nullable|array',
            'skills_talents' => 'nullable|array',

            // 5. Гавъяа шагнал
            'awards' => 'nullable|array',

            // 6. Тодорхойлолт
            'references' => 'nullable|array',

            // 7. Гэр бүл
            'is_married' => 'boolean',
            'family_members' => 'nullable|array',
            'family_relatives' => 'nullable|array',

            // 8. Бусад
            'health_status' => 'nullable|string|max:200',
            'goals_5years' => 'nullable|string|max:1000',
            'strengths' => 'nullable|string|max:1000',
            'weaknesses' => 'nullable|string|max:1000',
            'additional_info' => 'nullable|string|max:2000',
            'info_source' => 'nullable|string|max:200',
        ], [
            'desired_position.required' => 'Сонирхож буй албан тушаалаа сонгоно уу.',
        ]);

        // ── Давхар илгээлтээс хамгаалах: сүүлийн 1 минутад ижил утаснаас анкет ирсэн эсэх
        $recent = JobApplication::where('phone_mobile', $data['phone_mobile'])
            ->where('created_at', '>=', now()->subSeconds(self::RESUBMIT_COOLDOWN))
            ->latest('created_at')
            ->first();

        if ($recent) {
            $wait = max(1, self::RESUBMIT_COOLDOWN - $recent->created_at->diffInSeconds(now()));

            return back()->with(
                'error',
                "Таны анкет саяхан илгээгдсэн байна. Дахин илгээх бол {$wait} секундын дараа оролдоно уу."
            );
        }

        $application = JobApplication::create($data);

        $this->notifyAdmins($application);

        return back()->with('success', 'Таны анкет амжилттай илгээгдлээ. Бид тантай удахгүй холбоо барих болно.');
    }

    /**
     * Админуудад мэдэгдэл илгээх.
     * NewJobApplication нь ShouldQueue тул энд зөвхөн queue-д тавигдана — SMTP хүлээхгүй.
     * Queue-д тавих үе амжилтгүй болсон ч анкет аль хэдийн хадгалагдсан тул
     * хэрэглэгчид 500 алдаа буцаахгүй — зөвхөн log-д бичнэ.
     */
    private function notifyAdmins(JobApplication $application): void
    {
        try {
            $admins = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->get();

            if ($admins->isEmpty()) {
                return;
            }

            Notification::send($admins, new NewJobApplication(
                applicantName: trim($application->last_name.' '.$application->first_name),
                phone: $application->phone_mobile,
                email: $application->email,
                position: $application->desired_position,
                submittedAt: $application->created_at->format('Y.m.d H:i'),
            ));
        } catch (Throwable $e) {
            Log::error('Ажлын анкетын мэдэгдэл илгээж чадсангүй', [
                'application_id' => $application->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
