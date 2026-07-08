<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ажилтанд хуваарь гаргах эрх (өөрийн салбарын хэмжээнд).
        // Утга: ['clinic','ortho','support'] — аль хэсгийн хуваарь гаргах эрхтэй.
        Schema::table('employees', function (Blueprint $table) {
            $table->json('schedule_permissions')->nullable()->after('extra_portals');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('schedule_permissions');
        });
    }
};
