<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Сургалтын бүтцийг дөрвөн шатлалтай болгоно:
 *
 *   Ангилал  →  Сургалт  →  Бүлэг  →  Хичээл
 *   (Керамик)   (Graphy SMA)  (Бэлтгэл)  (эхний алхам)
 *
 * Хоёул сонголттой: ангилалгүй сургалт, бүлэггүй хичээл хэвээр ажиллана.
 * Тиймээс одоо байгаа өгөгдөл эвдрэхгүй, админ аажмаар цэгцэлж болно.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('color', 20)->default('violet');   // UI kit-ийн Tone утга
            $table->string('icon', 40)->default('folder');    // дүрсний түлхүүр
            $table->unsignedInteger('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'order']);
        });

        Schema::table('lab_courses', function (Blueprint $table) {
            $table->foreignId('lab_category_id')
                ->nullable()
                ->after('id')
                ->constrained('lab_categories')
                ->nullOnDelete();
        });

        Schema::create('lab_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_course_id')->constrained('lab_courses')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->index(['lab_course_id', 'order']);
        });

        Schema::table('lab_lessons', function (Blueprint $table) {
            $table->foreignId('lab_section_id')
                ->nullable()
                ->after('lab_course_id')
                ->constrained('lab_sections')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lab_lessons', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lab_section_id');
        });

        Schema::dropIfExists('lab_sections');

        Schema::table('lab_courses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lab_category_id');
        });

        Schema::dropIfExists('lab_categories');
    }
};
