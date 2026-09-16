<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ирсэн webhook хүсэлт бүрийн ТҮҮХИЙ бичлэг.
 *
 * CallPro дахин илгээх (retry) бодлогогүй гэдгээ мэдэгдсэн — нэг алдсан
 * хүсэлт бүрмөсөн алдагдана. Тиймээс боловсруулалт амжилтгүй болсон ч
 * түүхий payload энд заавал үлдэнэ. Дараа нь дахин боловсруулах боломжтой.
 *
 * call_id nullable: дуудлагыг таньж чадаагүй ч мөрийг хаяхгүй.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('event', 24);              // start | answered | end | abandoned
            $table->string('unique_id', 64)->nullable();
            $table->json('payload');
            $table->string('source', 16)->default('realtime');
            $table->string('ip', 45)->nullable();
            $table->boolean('processed')->default(false);
            $table->text('error')->nullable();
            $table->timestamp('received_at');

            $table->index('unique_id');
            $table->index('received_at');
            $table->index(['processed', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_events');
    }
};
