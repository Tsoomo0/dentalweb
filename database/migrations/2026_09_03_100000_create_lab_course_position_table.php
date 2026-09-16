<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Дотоод сургалт — албан тушаалаар хандах эрх.
 *
 * Сургалтад НЭГ Ч албан тушаал холбоогүй бол бүх ажилтанд нээлттэй.
 * Холбогдсон тохиолдолд зөвхөн тэр албан тушаалтай ажилтан үзнэ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_course_position', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_course_id')->constrained('lab_courses')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();

            $table->unique(['lab_course_id', 'position_id']);
            $table->index('position_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_course_position');
    }
};
