<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Салбар бүрийн CallPro queue (дуудлагын бүлэг) нэрс.
 *
 * `Call abandoned` event-д `agent` талбар ОГТ ирдэггүй — зөвхөн `queue_name`.
 * Алдсан дуудлагыг салбарт хуваарилах цорын ганц түлхүүр нь энэ тул
 * заавал бөглөгдсөн байх ёстой.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->json('callpro_queues')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('callpro_queues');
        });
    }
};
