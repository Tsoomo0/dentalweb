<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->string('outstanding_paid_receipt')->nullable()->after('outstanding_paid_at');
            $table->string('outstanding_paid_method')->nullable()->after('outstanding_paid_receipt');
            $table->unsignedInteger('outstanding_paid_amount')->default(0)->after('outstanding_paid_method');
        });
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropColumn(['outstanding_paid_receipt', 'outstanding_paid_method', 'outstanding_paid_amount']);
        });
    }
};
