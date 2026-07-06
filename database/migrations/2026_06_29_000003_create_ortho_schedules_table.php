<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Гажиг заслын (orthodontics) хуваарь — сарын grid.
        // Мөр = гажиг заслын туслах эмч, өдөр бүрд: [салбар]/[гажиг заслын эмч] эсвэл төлөв.
        Schema::create('ortho_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete(); // туслах эмч
            $table->date('date');
            // work | warehouse | off | vacation | holiday
            $table->string('state')->default('work');
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_doctor_id')->nullable()->constrained('employees')->nullOnDelete(); // гажиг заслын эмч
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ortho_schedules');
    }
};
