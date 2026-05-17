<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_warnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type')->default('warning');
            $table->string('severity')->default('low');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->date('incident_date')->nullable();
            $table->string('action')->nullable();
            $table->text('action_detail')->nullable();
            $table->string('status')->default('sent');
            $table->text('employee_response')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_warnings');
    }
};
