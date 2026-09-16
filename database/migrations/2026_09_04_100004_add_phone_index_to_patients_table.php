<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Дуудлага ирэх бүрт утасны дугаараар өвчтөн хайна. Индексгүй бол хүснэгтийг
 * бүтнээр нь уншина — 6 сарын түүхэн датаг оруулах үед энэ нь мэдэгдэхүйц удаан.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->index('phone');
            $table->index('phone2');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['phone']);
            $table->dropIndex(['phone2']);
        });
    }
};
