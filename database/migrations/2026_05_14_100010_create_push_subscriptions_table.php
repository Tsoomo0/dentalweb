<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->text('endpoint');
            $table->string('p256dh_key');
            $table->string('auth_token');

            $table->string('user_agent')->nullable();
            $table->timestamp('last_used_at')->nullable();

            $table->timestamps();

            // endpoint is too long for a single-column unique on MySQL — combine with user_id hash via short prefix
            $table->index('user_id');
            $table->unique(['user_id', 'p256dh_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
