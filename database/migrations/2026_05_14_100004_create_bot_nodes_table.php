<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bot_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flow_id')->nullable()->constrained('bot_flows')->cascadeOnDelete();
            $table->string('key');
            $table->string('title')->nullable();
            $table->text('body');

            // backend handler ID — e.g. "user_payroll_last", "user_vacation_balance".
            // Resolver class injects dynamic data into the body before sending.
            $table->string('data_source')->nullable();

            $table->boolean('is_welcome')->default(false);

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['flow_id', 'key']);
            $table->index('is_welcome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bot_nodes');
    }
};
