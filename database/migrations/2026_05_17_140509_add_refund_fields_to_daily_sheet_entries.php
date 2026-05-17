<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->bigInteger('refund_amount')->default(0)->after('overpaid_used_amount');
            $table->timestamp('refunded_at')->nullable()->after('refund_amount');
            $table->string('refund_method', 20)->nullable()->after('refunded_at');
            $table->string('refund_reason', 500)->nullable()->after('refund_method');
            $table->unsignedBigInteger('refunded_by')->nullable()->after('refund_reason');
        });
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropColumn(['refund_amount', 'refunded_at', 'refund_method', 'refund_reason', 'refunded_by']);
        });
    }
};
