<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->unsignedInteger('overpaid_amount')->default(0)->after('gross_amount');
            $table->dateTime('overpaid_used_at')->nullable()->after('overpaid_amount');
            $table->string('overpaid_used_receipt', 100)->nullable()->after('overpaid_used_at');
            $table->string('overpaid_used_method', 50)->nullable()->after('overpaid_used_receipt');
            $table->unsignedInteger('overpaid_used_amount')->nullable()->after('overpaid_used_method');
        });
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropColumn([
                'overpaid_amount',
                'overpaid_used_at',
                'overpaid_used_receipt',
                'overpaid_used_method',
                'overpaid_used_amount',
            ]);
        });
    }
};
