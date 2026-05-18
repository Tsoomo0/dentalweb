<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_orders', function (Blueprint $table) {
            $table->id();
            $table->date('order_date');                    // захиалсан өдөр
            $table->string('lab_name', 200);                // явсан лаб нэр
            $table->string('patient_last_name', 100)->nullable();
            $table->string('patient_first_name', 100);
            $table->string('patient_phone', 30)->nullable();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->text('work_description');               // явсан ажлын нэр
            $table->bigInteger('amount_due')->default(0);   // төлөх дүн
            $table->bigInteger('amount_paid')->default(0);  // төлсөн дүн
            $table->foreignId('bender_employee_id')->nullable()->constrained('employees')->nullOnDelete();   // нугалсан
            $table->foreignId('polisher_employee_id')->nullable()->constrained('employees')->nullOnDelete(); // өнгөлсөн
            $table->date('arrived_date')->nullable();       // ажил ирсэн өдөр
            $table->date('pickup_date')->nullable();        // хүн ирж авах өдөр
            $table->boolean('is_completed')->default(false);// дууссан
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index('order_date');
            $table->index('is_completed');
            $table->index('branch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_orders');
    }
};
