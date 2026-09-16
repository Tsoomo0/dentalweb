<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Илгээгдсэн сургалтын сануулгын бүртгэл.
 *
 * Сануулга илгээгч команд өдөр бүр ажиллана. Юу илгээснээ хаа нэгтээ
 * тэмдэглэхгүй бол хугацаа хэтэрсэн ажилтан ӨДӨР БҮР ижил и-мэйл авч,
 * сануулга нь чимээ шуугиан болж хувирна — тэгээд хүмүүс уншихаа болино.
 *
 * Тиймээс мөр бүр "энэ ажилтанд, энэ хичээлээр, энэ төрлийн сануулга
 * илгээгдсэн" гэдгийг илэрхийлнэ. Unique индекс нь давхардлыг DB түвшинд
 * таслах тул зэрэг ажиллуулсан ч давхар илгээхгүй.
 *
 * Хугацаа (`due_at`) хожим өөрчлөгдвөл шинэ мөчлөг болно гэж үзэж, сануулгыг
 * дахин илгээх ёстой. Үүнийг `due_at` баганаар шийднэ — өөрчлөгдсөн бол
 * хуучин бүртгэл тохирохгүй тул шинэ сануулга явна.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_training_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lab_lesson_id')->constrained('lab_lessons')->cascadeOnDelete();
            $table->string('kind', 20);                  // due_soon | overdue
            $table->timestamp('due_at')->nullable();     // сануулга илгээх үеийн эцсийн хугацаа
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->unique(['user_id', 'lab_lesson_id', 'kind', 'due_at'], 'lab_reminder_unique');
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_training_reminders');
    }
};
