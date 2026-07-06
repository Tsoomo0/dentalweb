<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_ai_settings', function (Blueprint $table) {
            // Word/PDF-ээс их хэмжээний FAQ текст багтаах (TEXT ~65KB → LONGTEXT)
            $table->longText('extra_knowledge')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('social_ai_settings', function (Blueprint $table) {
            $table->text('extra_knowledge')->nullable()->change();
        });
    }
};
