<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ирцийн гурван арга (байршил / 4370 / push)-ыг нэгтгэх.
 *
 *   - branches.attendance_gps_enabled — салбарт утсаар байршлаар бүртгэхийг зөвшөөрөх эсэх
 *   - attendance_logs.check_in_source / check_out_source — өдрийн ирсэн/тарсан цаг аль аргаар орсон
 *   - Одоо байгаа GPS бүртгэлүүдийг attendance_punches руу хуулна: өдрийн нэгтгэл
 *     цаашид зөвхөн punch-аас тооцоологдох тул хуучин мэдээлэл алга болохгүй.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->boolean('attendance_gps_enabled')->default(true)->after('radius_m');
        });

        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->string('check_in_source', 8)->nullable()->after('checked_in_at');
            $table->string('check_out_source', 8)->nullable()->after('checked_out_at');
        });

        $now = now();

        DB::table('attendance_logs')->orderBy('id')->chunkById(500, function ($logs) use ($now) {
            $rows = [];

            foreach ($logs as $log) {
                if ($log->checked_in_at) {
                    $rows[] = [
                        'employee_id' => $log->employee_id,
                        'punched_at' => $log->checked_in_at,
                        'punch_type' => 0,
                        'source' => 'gps',
                        'lat' => $log->check_in_lat,
                        'lng' => $log->check_in_lng,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($log->checked_out_at) {
                    $rows[] = [
                        'employee_id' => $log->employee_id,
                        'punched_at' => $log->checked_out_at,
                        'punch_type' => 1,
                        'source' => 'gps',
                        'lat' => $log->check_out_lat,
                        'lng' => $log->check_out_lng,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            if ($rows) {
                DB::table('attendance_punches')->insert($rows);
            }
        });

        DB::table('attendance_logs')->whereNotNull('checked_in_at')->update(['check_in_source' => 'gps']);
        DB::table('attendance_logs')->whereNotNull('checked_out_at')->update(['check_out_source' => 'gps']);
    }

    public function down(): void
    {
        DB::table('attendance_punches')->where('source', 'gps')->delete();

        Schema::table('attendance_logs', function (Blueprint $table) {
            $table->dropColumn(['check_in_source', 'check_out_source']);
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('attendance_gps_enabled');
        });
    }
};
