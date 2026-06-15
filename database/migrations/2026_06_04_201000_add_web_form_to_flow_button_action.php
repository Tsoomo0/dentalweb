<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_flow_buttons', function (Blueprint $table) {
            $table->enum('action', ['next_node', 'flow_start', 'handoff', 'url', 'web_form'])->default('next_node')->change();
        });
    }

    public function down(): void
    {
        Schema::table('social_flow_buttons', function (Blueprint $table) {
            $table->enum('action', ['next_node', 'flow_start', 'handoff', 'url'])->default('next_node')->change();
        });
    }
};
