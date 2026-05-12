<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('leasing_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('treatment_record_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('total_amount')->default(0);
            $table->unsignedTinyInteger('months')->default(1);
            $table->unsignedInteger('monthly_amount')->default(0);
            $table->unsignedTinyInteger('paid_months')->default(0);
            $table->string('qpay_invoice_id')->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('leasing_plans'); }
};
