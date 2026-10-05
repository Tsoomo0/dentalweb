<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Төхөөрөмж дээрх хэрэглэгчийн PIN → ажилтан.
 *
 * Салбар бүрийн төхөөрөмж дээр нэг ажилтан өөр PIN-тэй байж болох тул
 * тааруулалтыг төхөөрөмж бүрээр хадгална. employee_id хоосон мөр нь
 * "тааруулаагүй PIN" — HR төхөөрөмжийн хуудаснаас тааруулна.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_device_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_device_id')->constrained()->cascadeOnDelete();
            $table->string('device_user_pin', 32);
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name')->nullable(); // төхөөрөмж дээр бичигдсэн нэр
            $table->timestamps();

            $table->unique(['attendance_device_id', 'device_user_pin'], 'attendance_device_users_device_pin_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_device_users');
    }
};
