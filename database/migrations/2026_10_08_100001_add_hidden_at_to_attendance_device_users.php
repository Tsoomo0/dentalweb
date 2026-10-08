<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Тааруулахгүй PIN-ийг нуух.
 *
 * Төхөөрөмж дээр гарсан ажилтан, туршилтын хэрэглэгч олон үлддэг тул HR
 * тэднийг «Нуусан» руу шилжүүлнэ — тааруулаагүйн тоо, санал, жагсаалтад
 * орохгүй. Бүртгэлүүд нь хэвээр хадгалагдаж, хүссэн үедээ сэргээж болно.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_device_users', function (Blueprint $table) {
            $table->timestamp('hidden_at')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_device_users', function (Blueprint $table) {
            $table->dropColumn('hidden_at');
        });
    }
};
