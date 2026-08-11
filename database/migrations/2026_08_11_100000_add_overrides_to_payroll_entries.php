<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Гараар засагдсан томьёотой баганы нэрсийг хадгална.
     *
     * Жишээ: ["net_hand"] → тухайн мөрийн "Гарт олгох" нь томьёогоор
     * бодогдохоо больж, нягтлангийн бичсэн дүн хэвээр үлдэнэ.
     */
    public function up(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->json('overrides')->nullable()->after('bank_salary');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->dropColumn('overrides');
        });
    }
};
