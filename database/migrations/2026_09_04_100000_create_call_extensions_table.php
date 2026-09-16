<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CallPro дотуур дугаар → салбар / ажилтан холбоос.
 *
 * Дугаарын мужийг кодод хатуу бичихгүй — админ талаас удирдана. CallPro-гийн
 * webhook дээр ирэх `agent` утга энд бүртгэлтэй бол дуудлага тухайн салбарт
 * хамаарна. Бүртгэлгүй дугаар ирвэл дуудлага салбаргүй хадгалагдаж, админ
 * талд "тодорхойгүй" гэж гарч ирнэ (дата алдагдахгүй).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_extensions', function (Blueprint $table) {
            $table->id();
            // CallPro-с ирэх утга 3 оронтой ч 4 оронтой ч байж болзошгүй тул string.
            $table->string('extension', 32)->unique();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('branch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_extensions');
    }
};
