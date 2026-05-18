<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            // Дутуу тооцоо төлж дуусгахад ашигласан баримтын мэдээлэл
            $table->string('final_payment_receipt', 100)->nullable()->after('amount_paid');
            $table->string('final_payment_method', 20)->nullable()->after('final_payment_receipt'); // cash | card | mobile | storepay
            $table->timestamp('final_payment_at')->nullable()->after('final_payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropColumn(['final_payment_receipt', 'final_payment_method', 'final_payment_at']);
        });
    }
};
