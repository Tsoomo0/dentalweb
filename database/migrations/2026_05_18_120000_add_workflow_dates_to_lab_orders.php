<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->date('sent_to_lab_date')->nullable()->after('order_date'); // лаб руу явуулсан өдөр
            $table->date('lab_ready_date')->nullable()->after('polisher_employee_id'); // лабораторид бэлэн болсон өдөр
        });
    }

    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropColumn(['sent_to_lab_date', 'lab_ready_date']);
        });
    }
};
