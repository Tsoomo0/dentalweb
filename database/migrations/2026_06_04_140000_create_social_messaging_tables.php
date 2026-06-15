<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Гадны хэрэглэгч (Messenger PSID эсвэл Instagram IGSID)
        Schema::create('social_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')->constrained('social_accounts')->cascadeOnDelete();
            $table->enum('channel', ['messenger', 'instagram'])->index();
            $table->string('external_id'); // PSID / IGSID
            $table->string('name')->nullable();
            $table->string('username')->nullable();
            $table->text('avatar')->nullable();
            $table->timestamp('last_interacted_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['social_account_id', 'channel', 'external_id']);
        });

        // Харилцаа (нэг contact = нэг thread)
        Schema::create('social_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')->constrained('social_accounts')->cascadeOnDelete();
            $table->foreignId('social_contact_id')->constrained('social_contacts')->cascadeOnDelete();
            $table->enum('channel', ['messenger', 'instagram'])->index();
            $table->enum('status', ['bot', 'open', 'closed'])->default('open')->index();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('last_message_text', 1000)->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->unsignedInteger('unread_count')->default(0);
            $table->timestamp('window_expires_at')->nullable(); // Meta 24h messaging window
            $table->timestamps();

            $table->unique('social_contact_id');
            $table->index(['social_account_id', 'last_message_at']);
        });

        // Мессеж
        Schema::create('social_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_conversation_id')->constrained('social_conversations')->cascadeOnDelete();
            $table->enum('direction', ['in', 'out'])->index();
            $table->enum('sender', ['contact', 'agent', 'bot', 'ai'])->default('contact');
            $table->string('type')->default('text'); // text / image / attachment
            $table->text('text')->nullable();
            $table->json('attachments')->nullable();
            $table->string('external_mid')->nullable()->index(); // Meta message id
            $table->foreignId('sent_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['social_conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_messages');
        Schema::dropIfExists('social_conversations');
        Schema::dropIfExists('social_contacts');
    }
};
