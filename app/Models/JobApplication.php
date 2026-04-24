<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = [
        'last_name', 'first_name', 'family_name', 'gender', 'birth_city',
        'birth_date', 'register_no', 'has_insurance', 'has_health_insurance',
        'address', 'has_driving_license', 'driving_class', 'has_car',
        'phone_home', 'phone_mobile', 'email',
        'education', 'professional_training',
        'total_work_years', 'unverified_work_years', 'employment_status', 'work_experience',
        'skills_languages', 'skills_computer', 'skills_talents',
        'awards', 'references',
        'is_married', 'family_members', 'family_relatives',
        'health_status', 'goals_5years', 'strengths', 'weaknesses',
        'additional_info', 'info_source',
        'status', 'admin_notes',
    ];

    protected $casts = [
        'birth_date'            => 'date',
        'has_insurance'         => 'boolean',
        'has_health_insurance'  => 'boolean',
        'has_driving_license'   => 'boolean',
        'has_car'               => 'boolean',
        'is_married'            => 'boolean',
        'education'             => 'array',
        'professional_training' => 'array',
        'work_experience'       => 'array',
        'skills_languages'      => 'array',
        'skills_computer'       => 'array',
        'skills_talents'        => 'array',
        'awards'                => 'array',
        'references'            => 'array',
        'family_members'        => 'array',
        'family_relatives'      => 'array',
    ];

    public function getFullNameAttribute(): string
    {
        return $this->last_name . ' ' . $this->first_name;
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending'    => 'Хүлээгдэж буй',
            'reviewed'   => 'Хянасан',
            'shortlisted' => 'Сонгогдсон',
            'rejected'   => 'Татгалзсан',
            default      => $this->status,
        };
    }
}
