<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_broadcasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')->nullable()->constrained('social_accounts')->nullOnDelete();
            $table->string('name');
            $table->text('text')->nullable();
            $table->text('image_url')->nullable();
            $table->string('button_label')->nullable();
            $table->text('button_url')->nullable();
            $table->json('filters')->nullable();          // {channel, gender, audience, tag, only_reachable}
            $table->string('status', 16)->default('draft'); // draft / sending / done / failed
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('social_broadcast_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_broadcast_id')->constrained('social_broadcasts')->cascadeOnDelete();
            $table->foreignId('social_contact_id')->constrained('social_contacts')->cascadeOnDelete();
            $table->string('status', 16)->default('pending'); // pending / sent / failed
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['social_broadcast_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_broadcast_recipients');
        Schema::dropIfExists('social_broadcasts');
    }
};
