<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leasing_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leasing_plan_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('installment_number');
            $table->date('due_date')->nullable();
            $table->string('payment_method')->nullable();
            $table->unsignedInteger('amount')->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leasing_installments');
    }
};
