<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobApplicationController extends Controller
{
    public function index()
    {
        return Inertia::render('job-application');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            // 1. Үндсэн мэдээлэл
            'last_name'             => 'required|string|max:100',
            'first_name'            => 'required|string|max:100',
            'family_name'           => 'nullable|string|max:100',
            'gender'                => 'nullable|string|max:20',
            'birth_city'            => 'nullable|string|max:100',
            'birth_date'            => 'nullable|date',
            'register_no'           => 'nullable|string|max:20',
            'has_insurance'         => 'boolean',
            'has_health_insurance'  => 'boolean',
            'address'               => 'nullable|string|max:500',
            'has_driving_license'   => 'boolean',
            'driving_class'         => 'nullable|string|max:20',
            'has_car'               => 'boolean',
            'phone_home'            => 'nullable|string|max:20',
            'phone_mobile'          => 'required|string|max:20',
            'email'                 => 'nullable|email|max:150',

            // 2. Боловсрол
            'education'             => 'nullable|array',
            'education.*'           => 'array',
            'professional_training' => 'nullable|array',
            'professional_training.*' => 'array',

            // 3. Ажлын туршлага
            'total_work_years'      => 'nullable|string|max:50',
            'unverified_work_years' => 'nullable|string|max:50',
            'employment_status'     => 'nullable|string|max:100',
            'work_experience'       => 'nullable|array',
            'work_experience.*'     => 'array',

            // 4. Ур чадвар
            'skills_languages'      => 'nullable|array',
            'skills_computer'       => 'nullable|array',
            'skills_talents'        => 'nullable|array',

            // 5. Гавъяа шагнал
            'awards'                => 'nullable|array',

            // 6. Тодорхойлолт
            'references'            => 'nullable|array',

            // 7. Гэр бүл
            'is_married'            => 'boolean',
            'family_members'        => 'nullable|array',
            'family_relatives'      => 'nullable|array',

            // 8. Бусад
            'health_status'         => 'nullable|string|max:200',
            'goals_5years'          => 'nullable|string|max:1000',
            'strengths'             => 'nullable|string|max:1000',
            'weaknesses'            => 'nullable|string|max:1000',
            'additional_info'       => 'nullable|string|max:2000',
            'info_source'           => 'nullable|string|max:200',
        ]);

        JobApplication::create($data);

        return back()->with('success', 'Таны анкет амжилттай илгээгдлээ. Бид тантай удахгүй холбоо барих болно.');
    }
}
