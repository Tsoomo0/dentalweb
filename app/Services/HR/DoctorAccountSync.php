<?php

namespace App\Services\HR;

use App\Models\Doctor;
use App\Models\HR\Employee;

/**
 * Ажилтны албан тушаалын portal-той Doctor бүртгэлийг тааруулна.
 *
 * Ажилтны мэдээлэл өөрчлөгдөхөд (EmployeeController) болон албан тушаалын
 * portal өөрчлөгдөхөд (PositionController) аль алинд нь дуудагдана.
 */
class DoctorAccountSync
{
    /**
     * @param  bool  $syncPhoto  Ажилтны зураг шинэчлэгдсэн бол Doctor руу хуулах эсэх.
     */
    public static function sync(Employee $employee, bool $syncPhoto = false): ?Doctor
    {
        $isDoctorPosition = $employee->position?->portal === 'doctor';
        $doctor = $employee->doctor()->withTrashed()->first();

        if (! $isDoctorPosition) {
            // Эмчийн тушаалаас өөр тушаал руу шилжсэн — эмчийн нэвтрэлтийг хаана.
            // Үлдсэн Doctor бүртгэл нь ижил мэйл/нууц үгтэй тул нэвтрэх үед
            // doctor guard-д эхэлж баригдаад, ажилтныг өөрийн порталд
            // (lab, reception гэх мэт) оруулахгүй болгодог.
            if ($doctor && ! $doctor->trashed()) {
                $doctor->delete();
            }

            return null;
        }

        if ($doctor) {
            $syncData = [
                'branch_id' => $employee->branch_id,
                'name' => $employee->full_name,
                'specialization' => $employee->position?->name ?? $doctor->specialization,
                'phone' => $employee->phone,
                'email' => $employee->user?->email ?? $employee->email,
            ];
            if ($syncPhoto) {
                $syncData['photo'] = $employee->photo;
            }
            if ($doctor->trashed()) {
                $doctor->restore();
            }
            $doctor->update($syncData);
        } else {
            $loginEmail = $employee->user?->email ?? $employee->email;

            // Нэвтрэх мэйлгүй ажилтанд Doctor бүртгэл үүсгэх утгагүй —
            // хоосон мэйл/нууц үгтэй бүртгэл рүү хэн ч нэвтэрч чадахгүй.
            if (! $loginEmail) {
                return null;
            }

            // Эмчийн тушаал руу шинээр шилжсэн — Doctor бүртгэл үүсгэнэ.
            $doctor = Doctor::create([
                'employee_id' => $employee->id,
                'branch_id' => $employee->branch_id,
                'name' => $employee->full_name,
                'specialization' => $employee->position?->name,
                'phone' => $employee->phone,
                'email' => $loginEmail,
                'photo' => $employee->photo,
                'is_active' => true,
                'password' => $employee->user?->password,
            ]);
        }

        if ($employee->branch_id) {
            $doctor->branches()->sync([$employee->branch_id]);
        }

        return $doctor;
    }
}
