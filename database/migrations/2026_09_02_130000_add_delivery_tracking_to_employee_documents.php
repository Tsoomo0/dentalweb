<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Баталгаажсан гэрээ и-мэйлээр хүрсэн эсэхийг HR талаас харах боломж.
     * Ингэснээр «ажилтанд ирээгүй» гэсэн тохиолдлыг шалгаж, дахин илгээнэ.
     */
    public function up(): void
    {
        Schema::table('hr_employee_documents', function (Blueprint $table) {
            $table->timestamp('delivered_at')->nullable()->after('completed_at');
            $table->text('delivery_error')->nullable()->after('delivered_at');
            $table->json('delivered_to')->nullable()->after('delivery_error');
        });
    }

    public function down(): void
    {
        Schema::table('hr_employee_documents', function (Blueprint $table) {
            $table->dropColumn(['delivered_at', 'delivery_error', 'delivered_to']);
        });
    }
};
