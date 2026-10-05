<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Бүх ажилтны бүх ээлж нэг хүснэгтэд (эмч, сувилагч, гажиг засал, туслах ажилтан).
        //
        // Ноорог → Нийтлэх: ажилтан, ирц зөвхөн status=published мөрийг хардаг.
        // Нийтлэгдсэн ээлжийг засахад тэр мөрөнд хүрэхгүй — replaces_id-тай ноорог
        // үүсгэнэ (is_removal=true бол "устгана" гэсэн ноорог). Нийтлэх үед ноорог
        // нийтлэгдсэн мөрөө дарж бичээд устана, тиймээс нийтлэгдсэн мөрийн id тогтвортой.
        //
        // Нэг ажилтан нэг өдөр хэд хэдэн ээлжтэй байж болно (өглөө Сансар, орой Хороолол).
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            $table->foreignId('shift_template_id')->nullable()->constrained('shift_templates')->nullOnDelete();
            $table->string('kind', 10)->default('work'); // work | off
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->unsignedSmallInteger('break_minutes')->default(0);
            $table->foreignId('assigned_doctor_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('room', 50)->nullable();
            $table->string('note', 500)->nullable();

            $table->string('status', 10)->default('draft'); // draft | published
            $table->foreignId('replaces_id')->nullable()->constrained('shifts')->cascadeOnDelete();
            $table->boolean('is_removal')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->string('source', 20)->nullable(); // manual | pattern | copy | swap | legacy

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['date', 'status']);
            $table->index(['employee_id', 'date']);
            $table->index(['branch_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
