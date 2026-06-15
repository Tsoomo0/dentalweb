<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Flow — нэг автоматжуулалт (welcome / keyword / default trigger)
        Schema::create('social_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')->nullable()->constrained('social_accounts')->cascadeOnDelete();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('icon', 8)->nullable();
            $table->enum('trigger_type', ['welcome', 'keyword', 'default'])->default('keyword')->index();
            $table->json('keywords')->nullable(); // keyword trigger үед
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Node — flow доторх нэг мессеж карт (текст + товчнууд)
        Schema::create('social_flow_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flow_id')->constrained('social_flows')->cascadeOnDelete();
            $table->string('key')->nullable();
            $table->string('title')->nullable();
            $table->text('body');
            $table->boolean('is_entry')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Button — node доорх сонголт (quick reply / handoff / url)
        Schema::create('social_flow_buttons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('node_id')->constrained('social_flow_nodes')->cascadeOnDelete();
            $table->string('label');
            $table->enum('action', ['next_node', 'flow_start', 'handoff', 'url'])->default('next_node');
            $table->foreignId('target_node_id')->nullable()->constrained('social_flow_nodes')->nullOnDelete();
            $table->foreignId('target_flow_id')->nullable()->constrained('social_flows')->nullOnDelete();
            $table->string('url')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_flow_buttons');
        Schema::dropIfExists('social_flow_nodes');
        Schema::dropIfExists('social_flows');
    }
};
