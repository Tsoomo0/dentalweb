<?php

namespace App\Http\Controllers\My;

use App\Http\Controllers\Controller;
use App\Models\HR\EmployeeFamilyMember;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FamilyMemberController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee) {
            abort(403);
        }

        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'relationship' => 'required|string|max:50',
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'employment_status' => 'nullable|string|max:100',
        ]);

        EmployeeFamilyMember::create([
            'employee_id' => $employee->id,
            'last_name' => $request->last_name ?? '',
            'first_name' => $request->first_name,
            'relationship' => $request->relationship,
            'phone' => $request->phone,
            'birth_date' => $request->birth_date,
            'employment_status' => $request->employment_status,
        ]);

        return back()->with('success', 'Гэр бүлийн гишүүн нэмэгдлээ.');
    }

    public function update(Request $request, EmployeeFamilyMember $familyMember): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee || $familyMember->employee_id !== $employee->id) {
            abort(403);
        }

        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'relationship' => 'required|string|max:50',
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'employment_status' => 'nullable|string|max:100',
        ]);

        $familyMember->update([
            'last_name' => $request->last_name ?? '',
            'first_name' => $request->first_name,
            'relationship' => $request->relationship,
            'phone' => $request->phone,
            'birth_date' => $request->birth_date ?: null,
            'employment_status' => $request->employment_status,
        ]);

        return back()->with('success', 'Мэдээлэл шинэчлэгдлээ.');
    }

    public function destroy(EmployeeFamilyMember $familyMember): RedirectResponse
    {
        $employee = ProfileController::resolveEmployee();
        if (! $employee || $familyMember->employee_id !== $employee->id) {
            abort(403);
        }

        $familyMember->delete();

        return back()->with('success', 'Гэр бүлийн гишүүн устгагдлаа.');
    }
}
