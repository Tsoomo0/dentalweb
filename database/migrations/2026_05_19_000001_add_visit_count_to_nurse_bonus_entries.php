<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nurse_bonus_entries', function (Blueprint $table) {
            $table->unsignedInteger('visit_count')->default(0)->after('material_prep');
        });
    }

    public function down(): void
    {
        Schema::table('nurse_bonus_entries', function (Blueprint $table) {
            $table->dropColumn('visit_count');
        });
    }
};
