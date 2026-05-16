<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->unsignedInteger('gross_amount')->default(0)->after('appointment_number');
        });
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropColumn('gross_amount');
        });
    }
};
