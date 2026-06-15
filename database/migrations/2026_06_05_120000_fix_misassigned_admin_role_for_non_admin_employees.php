<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * 1) "employee" гэсэн шинэ role нэмнэ (доктор/HR/лаб/портал-гүй ажилтнуудад).
     *    /my хэсэг (ажилтны үндсэн хэсэг)-руу нэвтрэх үндсэн role.
     *
     * 2) Хуучин EmployeeController::portalToRole() алдаатай байсан тул
     *    portal=hr|lab|doctor|null зэрэг ажилтнууд алдаатайгаар role=admin
     *    болж очсон. Тэднийг тохирох роль руу буцаана:
     *      - position.portal='admin'      → role='admin' (хэвээр үлдэнэ)
     *      - position.portal='reception'  → role='receptionist'
     *      - бусад (hr/lab/doctor/null)    → role='employee' (зөвхөн /my)
     */
    public function up(): void
    {
        // 1) employee role-ыг үүсгэнэ (байхгүй бол)
        $employeeRoleId = DB::table('roles')->where('name', 'employee')->value('id');
        if (! $employeeRoleId) {
            $employeeRoleId = DB::table('roles')->insertGetId([
                'name' => 'employee',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $adminRoleId        = DB::table('roles')->where('name', 'admin')->value('id');
        $receptionistRoleId = DB::table('roles')->where('name', 'receptionist')->value('id');

        if (! $adminRoleId) {
            return;
        }

        // 2) Буруу admin болсон ажилтнуудыг буцаана
        $employees = DB::table('employees')
            ->join('users', 'employees.user_id', '=', 'users.id')
            ->leftJoin('positions', 'employees.position_id', '=', 'positions.id')
            ->where('users.role_id', $adminRoleId)
            ->whereNull('employees.deleted_at')
            ->select('users.id as user_id', 'positions.portal as portal')
            ->get();

        foreach ($employees as $row) {
            $newRoleId = match ($row->portal) {
                'admin'     => $adminRoleId,                            // үлдээх
                'reception' => $receptionistRoleId ?? $employeeRoleId,  // receptionist рүү
                default     => $employeeRoleId,                         // hr/lab/doctor/null → employee
            };

            if ($newRoleId !== $adminRoleId) {
                DB::table('users')->where('id', $row->user_id)->update(['role_id' => $newRoleId]);
            }
        }
    }

    public function down(): void
    {
        // Буцаах боломжгүй — security fix
    }
};
