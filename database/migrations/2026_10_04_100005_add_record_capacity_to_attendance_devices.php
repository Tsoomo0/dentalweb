<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Төхөөрөмжийн санах ойн дүүргэлт.
 *
 * Бүртгэлийг автоматаар устгадаггүй тул төхөөрөмж (JDF200 — 50,000 бүртгэл)
 * хэдэн жилийн дараа дүүрч, дүүрмэгц шинэ бүртгэл авахаа больдог. Агент
 * тоог нь илгээж, 80%-иас дээш бол HR хуудсанд анхааруулга гарна.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->unsignedInteger('records_count')->nullable()->after('clock_drift_seconds');
            $table->unsignedInteger('records_capacity')->nullable()->after('records_count');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->dropColumn(['records_count', 'records_capacity']);
        });
    }
};
