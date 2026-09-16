<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Дуудлагыг өвчтний картаас бүрмөсөн салгана.
 *
 * Дуудлагын бүртгэл нь утасны дугаарын түүх — гаднаас ирсэн, манайхаас
 * гарсан дуудлага гэдгээрээ л утгатай. Дугаарыг өвчтөнтэй тааруулах нь
 * буруу таарах эрсдэлтэй (гэр бүл нэг дугаар хуваалцах, дугаар шилжих) ба
 * эмнэлгийн картыг дуудлагын датагаар бохирдуулна.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->dropConstrainedForeignId('patient_id');
        });
    }

    public function down(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->foreignId('patient_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });
    }
};
