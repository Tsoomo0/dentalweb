<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_comment_rules', function (Blueprint $table) {
            // Комментод ил хариу бичих (replyToComment) сүүлд амжилтгүй болсон бол Graph API-ийн алдааг энд хадгална.
            // Амжилттай бол null болгож цэвэрлэнэ — admin панелд шууд харагдана.
            $table->string('public_reply_error')->nullable()->after('public_reply');
        });
    }

    public function down(): void
    {
        Schema::table('social_comment_rules', function (Blueprint $table) {
            $table->dropColumn('public_reply_error');
        });
    }
};
