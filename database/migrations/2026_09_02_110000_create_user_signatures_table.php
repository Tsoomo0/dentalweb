<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Хэрэглэгчийн хадгалсан гарын үсэг — нэг удаа зурж/оруулаад цаашид
     * гэрээ, баримт бүрд дахин ашиглана.
     */
    public function up(): void
    {
        Schema::create('user_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 80)->nullable();
            // data:image/png;base64,… хэлбэрээр хадгална — баримтад шууд суулгана
            $table->longText('image');
            $table->string('source', 20)->default('draw'); // draw | upload
            $table->boolean('is_default')->default(false);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_signatures');
    }
};
