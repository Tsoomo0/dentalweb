<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_ai_faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question');   // Сэдэв + жишээ асуулт (ангилагчид туслах)
            $table->text('answer');        // Хүний бичсэн тогтмол монгол хариу (+{{slot}})
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        // Retrieval (хүн бичсэн) эсвэл generative (AI зохиох) горим
        Schema::table('social_ai_settings', function (Blueprint $table) {
            $table->string('mode')->default('generative')->after('provider'); // generative | retrieval
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_ai_faqs');
        Schema::table('social_ai_settings', function (Blueprint $table) {
            $table->dropColumn('mode');
        });
    }
};
