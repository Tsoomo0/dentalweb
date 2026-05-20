<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nurse_bonus_runs', function (Blueprint $table) {
            $table->date('date')->nullable()->after('id');
        });

        // Backfill: month/half-аас огноог тооцон бөглөнө (хуучин run-уудад)
        // - first half → 1-р өдөр
        // - second half → 16-р өдөр
        DB::table('nurse_bonus_runs')->whereNull('date')->get()
            ->each(function ($row) {
                $day = $row->half === 'first' ? 1 : 16;
                $date = sprintf('%04d-%02d-%02d', $row->year, $row->month, $day);
                DB::table('nurse_bonus_runs')->where('id', $row->id)->update(['date' => $date]);
            });
    }

    public function down(): void
    {
        Schema::table('nurse_bonus_runs', function (Blueprint $table) {
            $table->dropColumn('date');
        });
    }
};
