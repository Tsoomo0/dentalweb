<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Page (social_account) салгахад flow болон коммент дүрэм (тохиргоо) устдаг
 * байсныг засна: cascadeOnDelete -> nullOnDelete. Ингэснээр page салгахад
 * урсгал устахгүй, зүгээр "бүх page" (account_id = null) болж хадгалагдана.
 *
 * Харилцаа/контакт (runtime өгөгдөл) нь хэвээр cascade — тэр нь зөв.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_flows', function (Blueprint $table) {
            $table->dropForeign(['social_account_id']);
            $table->foreign('social_account_id')->references('id')->on('social_accounts')->nullOnDelete();
        });

        Schema::table('social_comment_rules', function (Blueprint $table) {
            $table->dropForeign(['social_account_id']);
            $table->foreign('social_account_id')->references('id')->on('social_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('social_flows', function (Blueprint $table) {
            $table->dropForeign(['social_account_id']);
            $table->foreign('social_account_id')->references('id')->on('social_accounts')->cascadeOnDelete();
        });

        Schema::table('social_comment_rules', function (Blueprint $table) {
            $table->dropForeign(['social_account_id']);
            $table->foreign('social_account_id')->references('id')->on('social_accounts')->cascadeOnDelete();
        });
    }
};
