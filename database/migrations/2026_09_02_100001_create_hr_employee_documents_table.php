<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_employee_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('hr_document_templates')->nullOnDelete();
            $table->string('type', 40)->index();
            $table->string('title');
            $table->string('doc_number', 60)->nullable();
            // Загвараас гаргаж авсан, орлуулга хийгдсэн HTML — цаашид загвар өөрчлөгдсөн ч
            // энэ баримт өөрчлөгдөхгүй байхаар хувилж хадгална.
            $table->longText('body');
            $table->json('variables')->nullable();
            // draft | pending_employer | pending_employee | completed | declined | cancelled
            $table->string('status', 30)->default('draft')->index();

            // ── Ажил олгогч (захирал) ──
            $table->string('employer_name')->nullable();
            $table->string('employer_position')->nullable();
            $table->foreignId('employer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->longText('employer_signature')->nullable();
            $table->timestamp('employer_signed_at')->nullable();

            // ── Ажилтан ──
            $table->string('employee_name')->nullable();
            $table->string('employee_position')->nullable();
            $table->longText('employee_signature')->nullable();
            $table->timestamp('employee_signed_at')->nullable();

            $table->date('effective_date')->nullable();
            $table->date('expires_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('pdf_path')->nullable();
            $table->text('notes')->nullable();
            $table->text('decline_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_employee_documents');
    }
};
