<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Үзэлтийн явцыг "хуримтлуулсан хугацаа"-наас "үзсэн хэсгийн зураглал" болгож
 * өөрчилнө.
 *
 * Өмнө нь progress = watched_seconds / duration байсан. Энэ нь хоёр талаараа
 * буруу байлаа:
 *   1. YouTube хичээлийн duration нь 0 байдаг тул эхний ping дээр шууд 100%
 *      болж "үзэж дууссан" гэж тэмдэглэгддэг байв.
 *   2. Ping бүрт бутархай секунд таслагдаж, түр зогсоох бүрт сегмент алдагдаж,
 *      бүтэн үзсэн ч 100% хүрдэггүй байв.
 *
 * Одоо видеог 5 секундын нүд болгон хувааж, үзсэн нүдийг '1' гэж тэмдэглэнэ.
 * progress = үзсэн нүд / нийт нүд. Дахин үзэхэд давхардахгүй, seek хийсэн
 * хэсэг тоологдохгүй, бүтэн үзвэл яг 100% болно.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_lesson_views', function (Blueprint $table) {
            $table->text('watched_buckets')->nullable()->after('watched_seconds');
        });

        // Хуучин аргаар бодогдсон хувь нь шинэ зураглалтай тохирохгүй тул
        // тэглэнэ — ажилчид дахин үзэхэд бодит утга хуримтлагдана.
        DB::table('lab_lesson_views')->update([
            'progress_percent' => 0,
            'watched_seconds'  => 0,
            'completed_at'     => null,
        ]);
    }

    public function down(): void
    {
        Schema::table('lab_lesson_views', function (Blueprint $table) {
            $table->dropColumn('watched_buckets');
        });
    }
};
