<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_work_schedules', function (Blueprint $table) {
            // Өдрийн нэмэлт үүрэг хуваарилалт (Карт гаргах/хураах, Загварын өрөө, Хэвлэх гэх мэт)
            $table->json('duties')->nullable()->after('assigned_doctor_id');
        });
    }

    public function down(): void
    {
        Schema::table('employee_work_schedules', function (Blueprint $table) {
            $table->dropColumn('duties');
        });
    }
};
