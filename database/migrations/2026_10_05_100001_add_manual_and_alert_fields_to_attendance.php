<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - attendance_punches.note / created_by — HR гараар нэмсэн бүртгэл (source = manual):
 *   хуруу дарахаа мартсан үед. Хэн, яагаад нэмсэн нь үргэлж харагдана.
 * - attendance_devices.offline_notified_at — ажлын цагаар дуугүй болсон төхөөрөмжийн
 *   талаар нэг тасралтад нэг л удаа мэдэгдэнэ; дахин холбогдмогц арилна.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_punches', function (Blueprint $table) {
            $table->string('note', 255)->nullable()->after('lng');
            $table->foreignId('created_by')->nullable()->after('note')->constrained('users')->nullOnDelete();
        });

        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->timestamp('offline_notified_at')->nullable()->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_punches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('note');
        });

        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->dropColumn('offline_notified_at');
        });
    }
};
