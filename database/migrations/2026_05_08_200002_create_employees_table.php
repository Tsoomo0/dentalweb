<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_number')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('photo')->nullable();
            $table->string('last_name')->nullable();
            $table->string('first_name')->nullable();
            $table->string('register_number')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('gender')->nullable();
            $table->string('family_name')->nullable();
            $table->string('ethnicity')->nullable();
            $table->string('birth_place')->nullable();
            $table->string('blood_type')->nullable();
            $table->string('driver_license')->nullable();
            $table->boolean('military_service')->default(false);
            $table->string('education_degree')->nullable();
            $table->string('education_school')->nullable();
            $table->string('education_major')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('emergency_name')->nullable();
            $table->string('emergency_phone')->nullable();
            $table->string('emergency_relation')->nullable();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('position_id')->nullable()->constrained('positions')->nullOnDelete();
            $table->decimal('salary', 12, 2)->nullable();
            $table->date('hired_date')->nullable();
            $table->date('probation_end_date')->nullable();
            $table->string('status')->default('active');
            $table->integer('vacation_extra_days')->default(0);
            $table->integer('ndsh_years')->default(0);
            $table->string('bank_name')->nullable();
            $table->string('bank_account')->nullable();
            $table->string('bank_account_name')->nullable();
            $table->boolean('is_married')->default(false);
            $table->boolean('has_children')->default(false);
            $table->integer('children_count')->default(0);
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
