<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_flow_buttons', function (Blueprint $table) {
            // true бол товчийг "quick reply" (хөнгөн чип) хэлбэрээр илгээнэ — навигацид тохиромжтой.
            $table->boolean('is_quick_reply')->default(false)->after('action');
        });
    }

    public function down(): void
    {
        Schema::table('social_flow_buttons', function (Blueprint $table) {
            $table->dropColumn('is_quick_reply');
        });
    }
};
