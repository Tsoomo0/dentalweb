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

        if (DB::getDriverName() === 'mysql') {
            DB::statement('
                UPDATE daily_sheet_entries dse
                JOIN appointments a ON a.appointment_number = dse.appointment_number
                SET dse.appointment_id = a.id
                WHERE dse.appointment_number IS NOT NULL
                  AND dse.appointment_id IS NULL
            ');
        } else {
            DB::table('appointments')->whereNotNull('appointment_number')->orderBy('id')->chunk(500, function ($apts) {
                foreach ($apts as $a) {
                    DB::table('daily_sheet_entries')
                        ->whereNull('appointment_id')
                        ->where('appointment_number', $a->appointment_number)
                        ->update(['appointment_id' => $a->id]);
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
            $table->dropColumn('appointment_id');
        });
    }
};
