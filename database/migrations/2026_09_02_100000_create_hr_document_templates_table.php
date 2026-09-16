<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_document_templates', function (Blueprint $table) {
            $table->id();
            // job_description | employment | liability | nda | other
            $table->string('type', 40)->index();
            $table->string('title');
            $table->string('code', 60)->nullable()->unique();
            $table->foreignId('position_id')->nullable()->constrained('positions')->nullOnDelete();
            $table->text('description')->nullable();
            // {{placeholder}} орсон HTML агуулга
            $table->longText('body');
            $table->boolean('requires_employer_signature')->default(true);
            $table->boolean('requires_employee_signature')->default(true);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_document_templates');
    }
};
