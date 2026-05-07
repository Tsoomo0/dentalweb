<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('daily_sheets', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('doctors', fn(Blueprint $t) => $t->dropSoftDeletes());
        Schema::table('appointments', fn(Blueprint $t) => $t->dropSoftDeletes());
        Schema::table('daily_sheets', fn(Blueprint $t) => $t->dropSoftDeletes());
        Schema::table('daily_sheet_entries', fn(Blueprint $t) => $t->dropSoftDeletes());
    }
};
