<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();

            // Facebook Page (Messenger + холбосон Instagram-ийн эзэн)
            $table->string('page_id')->unique();
            $table->string('page_name');
            $table->text('page_access_token'); // encrypted (Page access token)
            $table->timestamp('token_expires_at')->nullable();

            // Холбосон Instagram Professional account (байж болно)
            $table->string('ig_id')->nullable()->index();
            $table->string('ig_username')->nullable();
            $table->string('avatar')->nullable();

            $table->boolean('is_active')->default(true)->index();
            $table->boolean('webhook_subscribed')->default(false);

            // Холбосон админ + нэмэлт мэдээлэл
            $table->foreignId('connected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('meta')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
    }
};
