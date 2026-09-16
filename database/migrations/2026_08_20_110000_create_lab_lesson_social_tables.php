<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Хичээлийн сэтгэгдэл ба reaction.
 *
 * Reaction нь polymorphic — хичээл дээр ч, сэтгэгдэл дээр ч ижил хүснэгт
 * ашиглана. Нэг хэрэглэгч нэг зүйл дээр ганц л reaction тавина (unique),
 * дахин дарвал төрөл нь солигдоно эсвэл цуцлагдана.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_lesson_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_lesson_id')->constrained('lab_lessons')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('lab_lesson_comments')->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_pinned')->default(false);   // админ онцолсон
            $table->boolean('is_hidden')->default(false);   // админ нуусан (устгаагүй)
            $table->timestamps();
            $table->softDeletes();

            $table->index(['lab_lesson_id', 'created_at']);
            $table->index('parent_id');
        });

        Schema::create('lab_reactions', function (Blueprint $table) {
            $table->id();
            $table->morphs('reactable');                    // LabLesson | LabLessonComment
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20);                     // like | love | wow | clap
            $table->timestamps();

            $table->unique(['reactable_type', 'reactable_id', 'user_id'], 'lab_reaction_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_reactions');
        Schema::dropIfExists('lab_lesson_comments');
    }
};
