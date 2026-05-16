<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_sheets', function (Blueprint $table) {
            $table->timestamp('morning_submitted_at')->nullable()->after('submitted_at');
            $table->foreignId('morning_receptionist_id')->nullable()->after('morning_submitted_at')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('daily_sheets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('morning_receptionist_id');
            $table->dropColumn('morning_submitted_at');
        });
    }
};
