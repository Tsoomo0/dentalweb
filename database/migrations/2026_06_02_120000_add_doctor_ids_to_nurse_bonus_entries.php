<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nurse_bonus_entries', function (Blueprint $table) {
            $table->json('doctor_ids')->nullable()->after('doctor_id');
        });

        // Backfill: одоо байгаа doctor_id-г doctor_ids массив руу хуулна
        DB::table('nurse_bonus_entries')
            ->whereNotNull('doctor_id')
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('nurse_bonus_entries')
                        ->where('id', $row->id)
                        ->update(['doctor_ids' => json_encode([$row->doctor_id])]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('nurse_bonus_entries', function (Blueprint $table) {
            $table->dropColumn('doctor_ids');
        });
    }
};
