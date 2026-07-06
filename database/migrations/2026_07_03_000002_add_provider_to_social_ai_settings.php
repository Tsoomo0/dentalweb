<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_ai_settings', function (Blueprint $table) {
            $table->string('provider')->default('gemini')->after('enabled'); // gemini | groq
        });
    }

    public function down(): void
    {
        Schema::table('social_ai_settings', function (Blueprint $table) {
            $table->dropColumn('provider');
        });
    }
};
