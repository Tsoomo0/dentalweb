<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Лабын дотоод сургалт — сургалт, видео хичээл, үзэлтийн явц.
 *
 * Видео файл өөрөө DB-д ОРОХГҮЙ. Энд зөвхөн метадата (зам эсвэл гадаад ID,
 * урт, хэмжээ, poster) хадгална. Бодит файл нь `lab_video` диск дээр
 * (default: storage/app/private/lab-videos) байрлана. `video_provider`
 * баганын ачаар дараа нь Cloudflare R2 / YouTube руу шилжихэд зөвхөн
 * .env солигдоно, код хэвээр үлдэнэ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_courses', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('cover_image')->nullable();       // public disk
            $table->unsignedInteger('order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_published', 'order']);
        });

        Schema::create('lab_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_course_id')->constrained('lab_courses')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('order')->default(0);

            // local | youtube | r2  — тоглуулагч энэ утгаар шийднэ
            $table->string('video_provider', 20)->default('local');
            $table->string('video_path')->nullable();        // local/r2 → дискний зам
            $table->string('video_ref')->nullable();         // youtube → video ID
            $table->string('poster_path')->nullable();       // public disk дээрх poster
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('checksum', 64)->nullable();      // sha256 — нөөцлөлт шалгахад
            $table->json('attachments')->nullable();         // [{name,path,size}] — PDF гарын авлага

            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['lab_course_id', 'order']);
            $table->index('is_published');
        });

        /**
         * Ажилтан бүрийн хичээл дэх явц — нэг ажилтан + нэг хичээл = нэг мөр.
         * `watched_seconds` нь ЗӨВХӨН бодитоор тоглосон хугацаагаар нэмэгдэнэ
         * (төгсгөл рүү чирвэл тоологдохгүй), тиймээс энэ нь жинхэнэ үзэлт.
         */
        Schema::create('lab_lesson_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_lesson_id')->constrained('lab_lessons')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('views_count')->default(0);      // хэдэн удаа нээсэн
            $table->unsignedInteger('watched_seconds')->default(0);  // хуримтлагдсан бодит үзэлт
            $table->unsignedInteger('last_position')->default(0);    // үргэлжлүүлэн үзэх цэг
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('first_viewed_at')->nullable();
            $table->timestamp('last_viewed_at')->nullable();
            $table->timestamps();

            $table->unique(['lab_lesson_id', 'user_id']);
            $table->index('completed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_lesson_views');
        Schema::dropIfExists('lab_lessons');
        Schema::dropIfExists('lab_courses');
    }
};
