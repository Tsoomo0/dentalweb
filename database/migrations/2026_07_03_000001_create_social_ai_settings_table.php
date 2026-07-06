<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_ai_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->text('system_rules')->nullable();   // AI-гийн зан төлөв / дүрэм
            $table->text('extra_knowledge')->nullable(); // Гараар нэмсэн мэдээлэл (DB-д байхгүй)
            $table->string('model')->nullable();         // Загварын override (хоосон бол config)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_ai_settings');
    }
};
