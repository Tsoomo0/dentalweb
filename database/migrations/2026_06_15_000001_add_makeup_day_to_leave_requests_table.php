<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->date('makeup_date')->nullable()->after('reason');   // Нөхөж ажиллах өдөр
            $table->text('makeup_note')->nullable()->after('makeup_date'); // Нөхөж ажиллах тайлбар
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['makeup_date', 'makeup_note']);
        });
    }
};
