<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Шалгалт — тест, асуулт, хариулт, оролдлого, өгсөн хариулт.
 *
 * Хугацааны хяналт СЕРВЕР талд (`expires_at`) — browser-ийн цаг өөрчилж
 * хугацаа сунгах боломжгүй. Зөв хариулт нь зөвхөн lab_exam_options.is_correct
 * дээр байх ба ажилтан руу илгээх payload-д хэзээ ч ороогүй байна.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_course_id')->nullable()->constrained('lab_courses')->nullOnDelete();
            $table->foreignId('lab_lesson_id')->nullable()->constrained('lab_lessons')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();   // null → хугацаагүй
            $table->unsignedTinyInteger('pass_percent')->default(60);
            $table->unsignedTinyInteger('max_attempts')->default(1);        // 0 → хязгааргүй
            $table->boolean('shuffle_questions')->default(true);
            $table->boolean('shuffle_options')->default(true);
            $table->string('show_answers', 20)->default('after_submit');    // never|after_submit|after_pass
            $table->timestamp('opens_at')->nullable();
            $table->timestamp('closes_at')->nullable();
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('is_published');
        });

        Schema::create('lab_exam_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_exam_id')->constrained('lab_exams')->cascadeOnDelete();
            $table->string('type', 20)->default('single');   // single|multiple|truefalse|text
            $table->text('body');
            $table->string('image_path')->nullable();
            $table->unsignedSmallInteger('points')->default(1);
            $table->unsignedInteger('order')->default(0);
            $table->text('explanation')->nullable();         // хариулт харуулах үед тайлбар
            $table->timestamps();

            $table->index(['lab_exam_id', 'order']);
        });

        Schema::create('lab_exam_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_exam_question_id')->constrained('lab_exam_questions')->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_correct')->default(false);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->index(['lab_exam_question_id', 'order']);
        });

        Schema::create('lab_exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_exam_id')->constrained('lab_exams')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('attempt_no')->default(1);
            $table->timestamp('started_at');
            $table->timestamp('expires_at')->nullable();     // сервер талын хугацаа
            $table->timestamp('submitted_at')->nullable();
            $table->decimal('score', 8, 2)->default(0);
            $table->decimal('max_score', 8, 2)->default(0);
            $table->unsignedTinyInteger('percent')->default(0);
            $table->boolean('is_passed')->default(false);
            $table->string('status', 20)->default('in_progress');  // in_progress|submitted|graded
            $table->json('question_order')->nullable();      // холилтыг оролдлого бүрт тогтмол барих
            $table->foreignId('graded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('graded_at')->nullable();
            $table->timestamps();

            $table->unique(['lab_exam_id', 'user_id', 'attempt_no'], 'lab_attempt_unique');
            $table->index(['lab_exam_id', 'status']);
        });

        Schema::create('lab_exam_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_exam_attempt_id')->constrained('lab_exam_attempts')->cascadeOnDelete();
            $table->foreignId('lab_exam_question_id')->constrained('lab_exam_questions')->cascadeOnDelete();
            $table->json('selected_option_ids')->nullable();
            $table->text('text_answer')->nullable();
            $table->boolean('is_correct')->nullable();       // null → гараар үнэлэх хүлээгдэж буй
            $table->decimal('points_awarded', 8, 2)->default(0);
            $table->text('feedback')->nullable();            // админы тайлбар
            $table->timestamps();

            $table->unique(['lab_exam_attempt_id', 'lab_exam_question_id'], 'lab_answer_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_exam_answers');
        Schema::dropIfExists('lab_exam_attempts');
        Schema::dropIfExists('lab_exam_options');
        Schema::dropIfExists('lab_exam_questions');
        Schema::dropIfExists('lab_exams');
    }
};
