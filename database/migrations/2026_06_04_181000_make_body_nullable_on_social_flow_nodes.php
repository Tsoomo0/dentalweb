<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            // action/condition/delay блокт body шаардлагагүй
            $table->text('body')->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            $table->text('body')->nullable(false)->change();
        });
    }
};
