<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Рентген техникч" position үүсгэнэ (байхгүй бол)
        if (!DB::table('positions')->where('name', 'Рентген техникч')->exists()) {
            DB::table('positions')->insert([
                'name'       => 'Рентген техникч',
                'portal'     => null,
                'department' => null,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->unsignedBigInteger('technician_employee_id')->nullable()->after('doctor_id');
            $table->foreign('technician_employee_id')->references('id')->on('employees')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropForeign(['technician_employee_id']);
            $table->dropColumn('technician_employee_id');
        });

        DB::table('positions')->where('name', 'Рентген техникч')->delete();
    }
};
