<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Туслах ажилтны (рентген техникч / ариутгалын сувилагч / ресепшн) хуваарь — сарын grid.
        // Мөр = ажилтан, өдөр бүрд: ээлж (Өглөө / Орой / Бүтэн / Амралт).
        Schema::create('support_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('date');
            // morning | afternoon | full | off
            $table->string('shift_type')->default('full');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_schedules');
    }
};
