<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_handoffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bot_conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('direct_conversation_id')->nullable()->constrained('chat_conversations')->nullOnDelete();

            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'assigned', 'closed'])->default('pending');

            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['assigned_admin_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_handoffs');
    }
};
