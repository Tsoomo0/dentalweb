<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $employee = $this->resolveEmployee();
        if (!$employee) return redirect()->route('portal.select');

        $employee->load(['branch', 'position', 'contracts', 'licenses', 'familyMembers']);

        return Inertia::render('my/profile', [
            'employee' => $this->format($employee),
        ]);
    }

    public static function resolveEmployee(): ?Employee
    {
        if (Auth::guard('doctor')->check()) {
            $doctor = Auth::guard('doctor')->user();
            return $doctor->employee_id ? Employee::find($doctor->employee_id) : null;
        }
        return Employee::where('user_id', Auth::id())->first();
    }

    public static function format(Employee $e): array
    {
        return [
            'id'              => $e->id,
            'employee_number' => $e->employee_number,
            'photo_url'       => $e->photo_url,
            'full_name'       => $e->full_name,
            'last_name'       => $e->last_name,
            'first_name'      => $e->first_name,
            'family_name'     => $e->family_name,
            'register_number' => $e->register_number,
            'birth_date'      => $e->birth_date?->format('Y-m-d'),
            'gender'          => $e->gender,
            'ethnicity'       => $e->ethnicity,
            'birth_place'     => $e->birth_place,
            'blood_type'      => $e->blood_type,
            'driver_license'  => $e->driver_license,
            'military_service'=> $e->military_service,
            'education_degree'=> $e->education_degree,
            'education_school'=> $e->education_school,
            'education_major' => $e->education_major,
            'phone'           => $e->phone,
            'email'           => $e->email,
            'address'         => $e->address,
            'emergency_name'      => $e->emergency_name,
            'emergency_phone'     => $e->emergency_phone,
            'emergency_relation'  => $e->emergency_relation,
            'position'        => $e->position?->name,
            'branch'          => $e->branch?->name,
            'status'          => $e->status,
            'hired_date'      => $e->hired_date?->format('Y-m-d'),
            'probation_end_date' => $e->probation_end_date?->format('Y-m-d'),
            'is_married'      => $e->is_married,
            'has_children'    => $e->has_children,
            'children_count'  => $e->children_count,
            'bank_name'       => $e->bank_name,
            'bank_account'    => $e->bank_account,
            'bank_account_name' => $e->bank_account_name,
            'contracts' => $e->contracts->map(fn($c) => [
                'id'            => $c->id,
                'contract_type' => $c->contract_type,
                'start_date'    => $c->start_date?->format('Y-m-d'),
                'end_date'      => $c->end_date?->format('Y-m-d'),
            ]),
            'licenses' => $e->licenses->map(fn($l) => [
                'id'         => $l->id,
                'name'       => $l->name,
                'issuer'     => $l->issuer,
                'start_date' => $l->start_date?->format('Y-m-d'),
                'end_date'   => $l->end_date?->format('Y-m-d'),
            ]),
            'family_members' => $e->familyMembers->map(fn($f) => [
                'id'                => $f->id,
                'last_name'         => $f->last_name,
                'first_name'        => $f->first_name,
                'relationship'      => $f->relationship,
                'phone'             => $f->phone,
                'birth_date'        => $f->birth_date?->format('Y-m-d'),
                'employment_status' => $f->employment_status,
            ]),
        ];
    }
}
