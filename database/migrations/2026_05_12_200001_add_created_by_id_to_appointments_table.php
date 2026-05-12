<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete()->after('confirmed_by');
            $table->foreignId('confirmed_by_id')->nullable()->constrained('users')->nullOnDelete()->after('created_by_id');
        });

        DB::statement("
            UPDATE appointments a
            JOIN users u ON u.name = a.created_by
            SET a.created_by_id = u.id
            WHERE a.created_by IS NOT NULL AND a.created_by_id IS NULL
        ");

        DB::statement("
            UPDATE appointments a
            JOIN users u ON u.name = a.confirmed_by
            SET a.confirmed_by_id = u.id
            WHERE a.confirmed_by IS NOT NULL AND a.confirmed_by_id IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['created_by_id']);
            $table->dropForeign(['confirmed_by_id']);
            $table->dropColumn(['created_by_id', 'confirmed_by_id']);
        });
    }
};
