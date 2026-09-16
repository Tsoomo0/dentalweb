<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Сургалтын модульд гурван боломж нэмнэ:
 *   1. Заавал үзэх хичээл + эцсийн хугацаа (хоцорсныг тайланд харуулна)
 *   2. Цагтай тэмдэглэл — ажилтан үзэж байхдаа бичиж, дараа нь тэр агшин руу
 *      шууд үсрэх боломжтой
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_lessons', function (Blueprint $table) {
            $table->boolean('is_required')->default(false)->after('is_published');
            $table->timestamp('due_at')->nullable()->after('is_required');
        });

        Schema::create('lab_lesson_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_lesson_id')->constrained('lab_lessons')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('position_seconds')->default(0);   // видеоны аль агшин
            $table->text('body');
            $table->timestamps();

            // Ажилтан өөрийн тэмдэглэлээ цагийн дарааллаар харна
            $table->index(['lab_lesson_id', 'user_id', 'position_seconds'], 'lab_note_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_lesson_notes');

        Schema::table('lab_lessons', function (Blueprint $table) {
            $table->dropColumn(['is_required', 'due_at']);
        });
    }
};
