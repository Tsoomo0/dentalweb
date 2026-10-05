<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ирцийн түүхий бүртгэл — гурван аргын бүх дарсан/бүртгэсэн цаг нэг дор.
 *
 *   source = gps  — ажилтан утаснаасаа байршлаар (device_id хоосон)
 *   source = pull — 4370 агент
 *   source = push — ADMS (/iclock)
 *   source = usb  — USB .dat файл оруулсан
 *
 * attendance_logs (өдрийн нэгтгэл) нь эндээс тооцоологдоно.
 * UNIQUE(device, pin, punched_at) — нэг бүртгэлийг хэдэн ч удаа илгээсэн давхардахгүй.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_punches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            // Бүртгэлийг автоматаар устгахгүй — бүртгэлтэй төхөөрөмжийг устгахыг хориглоно
            $table->foreignId('attendance_device_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('device_user_pin', 32)->nullable();
            $table->dateTime('punched_at');
            $table->unsignedTinyInteger('punch_type')->nullable(); // 0 ирсэн, 1 тарсан, ...
            $table->unsignedTinyInteger('verify_type')->nullable(); // 1 хуруу, 15 царай, ...
            $table->string('source', 8);
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->timestamps();

            $table->unique(['attendance_device_id', 'device_user_pin', 'punched_at'], 'attendance_punches_device_pin_time_unique');
            $table->index(['employee_id', 'punched_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_punches');
    }
};
