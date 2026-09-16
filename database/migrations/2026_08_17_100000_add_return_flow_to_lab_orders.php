<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Буцаалтын урсгал.
     *
     * Үйлчлүүлэгчид хийсэн ажил таарахгүй бол ресепшн буцаалт болгож лаб руу
     * явуулна. Лаб янзалж дуусаад ресепшн рүү буцаана. Энэ бүх мөчлөгт
     * ямар ч төлбөр тооцоо хийгдэхгүй тул анхны төлбөр/дуусгасан бүртгэлд
     * (amount_paid, final_payment_*, is_completed) огт хүрэхгүй — буцаалт нь
     * зэрэгцээ, тусдаа мөчлөг болж явна.
     *
     * return_status:
     *   null   — буцаалт байхгүй
     *   sent   — ресепшн буцаалт болгож лаб руу явуулсан
     *   ready  — лаб янзалж дуусаад ресепшн рүү буцаасан
     *   done   — ресепшн хүлээж аваад буцаалтыг хаасан
     */
    public function up(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->string('return_status', 10)->nullable()->after('completed_at');
            $table->unsignedSmallInteger('return_count')->default(0)->after('return_status');
            $table->text('return_reason')->nullable()->after('return_count');
            $table->timestamp('returned_at')->nullable()->after('return_reason');
            $table->foreignId('returned_by')->nullable()->after('returned_at')
                ->constrained('users')->nullOnDelete();
            $table->date('return_ready_date')->nullable()->after('returned_by');
            $table->timestamp('return_closed_at')->nullable()->after('return_ready_date');

            $table->index(['return_status', 'lab_name']);
        });
    }

    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropIndex(['return_status', 'lab_name']);
            $table->dropConstrainedForeignId('returned_by');
            $table->dropColumn([
                'return_status', 'return_count', 'return_reason',
                'returned_at', 'return_ready_date', 'return_closed_at',
            ]);
        });
    }
};
