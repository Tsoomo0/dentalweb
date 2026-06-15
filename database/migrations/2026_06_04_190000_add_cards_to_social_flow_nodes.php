<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            // Карусель (Хөдлөн жагсаалт) — картуудыг JSON-оор хадгална.
            // [{ image, title, subtitle, buttons:[{label, action, url, target_flow_id, target_node_id}] }]
            $table->json('cards')->nullable()->after('image_url');
        });
    }

    public function down(): void
    {
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            $table->dropColumn('cards');
        });
    }
};
