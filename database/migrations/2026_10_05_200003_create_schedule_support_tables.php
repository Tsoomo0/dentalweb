<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ажилтны давтагдах хэв маяг — "Даваа–Баасан өглөө", "А/Б долоо хоног".
        // days = cycle_weeks*7 урттай массив, өдөр бүр [{template_id, branch_id}] жагсаалт.
        Schema::create('schedule_patterns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->unique()->constrained('employees')->cascadeOnDelete();
            $table->unsignedTinyInteger('cycle_weeks')->default(1);
            $table->date('starts_on'); // мөчлөгийн 1-р долоо хоногийн Даваа
            $table->json('days');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Хүн хүчний доод шаардлага — "Сансар, Ресепшн, өдөрт ≥ 2".
        Schema::create('staffing_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();
            $table->unsignedTinyInteger('min_count')->default(1);
            $table->json('weekdays')->nullable(); // ISO 1=Даваа … 7=Ням, null = өдөр бүр
            $table->timestamps();

            $table->unique(['branch_id', 'position_id']);
        });

        // Ажилтан өөрөө "энэ өдөр боломжгүй" гэж тэмдэглэнэ — хуваарь гаргагчид сануулга болно.
        Schema::create('schedule_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('date');
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'date']);
        });

        // Ээлж шилжүүлэх / солилцох хүсэлт: хүсэгч → хамт ажилтан зөвшөөрнө → HR батална.
        Schema::create('shift_swap_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('shifts')->cascadeOnDelete();
            $table->foreignId('requester_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('target_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('target_shift_id')->nullable()->constrained('shifts')->cascadeOnDelete(); // байвал солилцоо
            $table->string('note', 500)->nullable();
            // pending_peer | pending_approval | approved | rejected | cancelled
            $table->string('status', 20)->default('pending_peer');
            $table->timestamp('peer_responded_at')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_swap_requests');
        Schema::dropIfExists('schedule_availabilities');
        Schema::dropIfExists('staffing_rules');
        Schema::dropIfExists('schedule_patterns');
    }
};
