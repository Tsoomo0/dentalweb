<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bot_buttons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('node_id')->constrained('bot_nodes')->cascadeOnDelete();

            $table->string('label');
            $table->string('icon')->nullable();

            $table->enum('action', [
                'next_node',
                'flow_start',
                'handoff',
                'url',
                'back',
                'close',
            ]);

            $table->foreignId('target_node_id')->nullable()->constrained('bot_nodes')->nullOnDelete();
            $table->foreignId('target_flow_id')->nullable()->constrained('bot_flows')->nullOnDelete();
            $table->string('target_url')->nullable();

            $table->integer('sort_order')->default(0);

            $table->timestamps();

            $table->index(['node_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bot_buttons');
    }
};
