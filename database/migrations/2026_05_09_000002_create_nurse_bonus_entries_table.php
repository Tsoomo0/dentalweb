<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nurse_bonus_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nurse_bonus_run_id')->constrained('nurse_bonus_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('clothing')->default(0);
            $table->unsignedInteger('hand_hygiene')->default(0);
            $table->unsignedInteger('chair_sterilization')->default(0);
            $table->unsignedInteger('equipment_prep')->default(0);
            $table->unsignedInteger('material_prep')->default(0);
            $table->unsignedInteger('card_issued')->default(0);
            $table->unsignedInteger('card_collected')->default(0);
            $table->unsignedInteger('pre_exam_prep')->default(0);
            $table->unsignedInteger('exam_chair_prep')->default(0);
            $table->unsignedInteger('post_exam_chair_sterilize')->default(0);
            $table->unsignedInteger('tube_sterilization')->default(0);
            $table->unsignedInteger('suction_filter')->default(0);
            $table->unsignedInteger('quartz_before')->default(0);
            $table->unsignedInteger('quartz_after')->default(0);
            $table->unsignedInteger('xray')->default(0);
            $table->unsignedInteger('model_cast')->default(0);
            $table->unsignedInteger('implant')->default(0);
            $table->unsignedInteger('blood_pressure')->default(0);
            $table->integer('complaint')->default(0);
            $table->integer('absent')->default(0);
            $table->float('total_amount')->default(0);
            $table->boolean('is_sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nurse_bonus_entries');
    }
};
