<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * branches.is_public — салбарыг нийтийн сайт (нүүр, салбарууд, холбоо барих) болон
 * онлайн цаг захиалгад харуулах эсэх. is_active нь дотоод ажлын (HR, ирц, хуваарь)
 * идэвхтэй эсэх тул тусдаа: оффис идэвхтэй ч нийтэд харагдах ёсгүй.
 *
 * Өмнө нь нэрэнд «офис/оффис/office» орсныг кодоор хасдаг байсан — тэдгээрийг
 * нуусан төлөвтэй шилжүүлж одоогийн харагдацыг хадгална.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->boolean('is_public')->default(true)->after('is_active');
        });

        DB::table('branches')
            ->where(fn ($q) => $q->where('name', 'like', '%офис%')
                ->orWhere('name', 'like', '%оффис%')
                ->orWhere('name', 'like', '%office%'))
            ->update(['is_public' => false]);
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('is_public');
        });
    }
};
