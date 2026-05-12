<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('treatment_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('treatment_type')->nullable();
            $table->string('tooth_numbers')->nullable();
            $table->text('chief_complaint')->nullable();
            $table->text('clinical_findings')->nullable();
            $table->text('treatment_performed')->nullable();
            $table->text('tools_materials')->nullable();
            $table->text('next_appointment_plan')->nullable();
            $table->text('doctor_notes')->nullable();
            $table->unsignedInteger('amount_charged')->default(0);
            $table->longText('doctor_signature')->nullable();
            $table->longText('patient_signature')->nullable();
            $table->date('record_date')->nullable();
            $table->json('services')->nullable();
            $table->string('payment_status')->default('pending');
            $table->string('payment_method')->nullable();
            $table->unsignedInteger('paid_amount')->default(0);
            $table->text('payment_note')->nullable();
            $table->unsignedInteger('discount_percent')->default(0);
            $table->unsignedInteger('discount_amount')->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('qpay_invoice_id')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('treatment_records'); }
};
