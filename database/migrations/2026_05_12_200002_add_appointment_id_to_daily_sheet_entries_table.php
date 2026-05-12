<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->foreignId('appointment_id')
                ->nullable()
                ->constrained('appointments')
                ->nullOnDelete()
                ->after('appointment_number');
        });

        DB::statement("
            UPDATE daily_sheet_entries dse
            JOIN appointments a ON a.appointment_number = dse.appointment_number
            SET dse.appointment_id = a.id
            WHERE dse.appointment_number IS NOT NULL
              AND dse.appointment_id IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
            $table->dropColumn('appointment_id');
        });
    }
};
