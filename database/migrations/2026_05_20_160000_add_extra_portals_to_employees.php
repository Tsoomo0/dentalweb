<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Нэмэлт портал нэвтрэх эрх (JSON array of portal strings)
            // Жишээ: ["reception"] — сувилагч ажилтан ресепшний портал руу мөн орох эрхтэй
            $table->json('extra_portals')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('extra_portals');
        });
    }
};
