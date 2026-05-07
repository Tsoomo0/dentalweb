<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_sheet_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_sheet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('row_order')->default(0);
            $table->string('patient_name')->nullable();
            $table->string('gender', 10)->nullable();
            $table->string('diagnosis')->nullable();
            $table->string('appointment_number')->nullable();
            $table->integer('discount')->default(0);
            $table->integer('total_amount')->default(0);
            $table->integer('cash_amount')->default(0);
            $table->integer('card_amount')->default(0);
            $table->integer('storepay_amount')->default(0);
            $table->integer('mobile_amount')->default(0);
            $table->integer('outstanding_amount')->default(0);
            $table->timestamp('outstanding_paid_at')->nullable();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_sheet_entries');
    }
};
