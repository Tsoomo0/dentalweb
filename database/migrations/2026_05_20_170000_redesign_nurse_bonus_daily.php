<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Run-д тухайн сувилагчийг тэмдэглэнэ (нэг run = нэг сувилагч × хагас сар)
        Schema::table('nurse_bonus_runs', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable()->after('branch_id')->constrained('employees')->nullOnDelete();
        });

        // Entry бүр одоо нэг өдөр болно (тухайн сувилагчийн өдрийн ажил)
        Schema::table('nurse_bonus_entries', function (Blueprint $table) {
            $table->date('date')->nullable()->after('employee_id');
            $table->foreignId('doctor_id')->nullable()->after('date')->constrained('doctors')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('nurse_bonus_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('doctor_id');
            $table->dropColumn('date');
        });
        Schema::table('nurse_bonus_runs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('employee_id');
        });
    }
};
