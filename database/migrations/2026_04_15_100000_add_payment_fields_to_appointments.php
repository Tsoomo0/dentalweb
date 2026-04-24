<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Төлбөрийн статус: pending | paid | failed
            $table->string('payment_status')->default('pending')->after('admin_notes');
            // Төлбөрийн дүн (төгрөгөөр)
            $table->unsignedInteger('payment_amount')->default(10000)->after('payment_status');
            // QPay invoice ID
            $table->string('qpay_invoice_id')->nullable()->after('payment_amount');
            // Google Meet линк
            $table->string('meet_link')->nullable()->after('qpay_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'payment_amount', 'qpay_invoice_id', 'meet_link']);
        });
    }
};
