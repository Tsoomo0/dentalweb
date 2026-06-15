<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_comment_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')->nullable()->constrained('social_accounts')->cascadeOnDelete();
            $table->string('name');
            $table->string('post_id')->nullable(); // хоосон = бүх пост
            $table->enum('match_type', ['any', 'contains', 'exact'])->default('contains');
            $table->json('keywords')->nullable(); // any үед хоосон
            $table->text('public_reply')->nullable(); // комментод нийтээр хариулах
            $table->text('dm_template')->nullable(); // хувийн DM текст
            $table->foreignId('dm_flow_id')->nullable()->constrained('social_flows')->nullOnDelete(); // эсвэл flow эхлүүлэх
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('matched_count')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_comment_rules');
    }
};
