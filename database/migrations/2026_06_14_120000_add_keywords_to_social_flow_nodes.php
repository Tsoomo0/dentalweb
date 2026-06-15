<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            // Энэ node-г шууд ажиллуулах түлхүүр үгс (чөлөөт текст таарвал шууд энэ блок руу).
            $table->json('keywords')->nullable()->after('key');
        });
    }

    public function down(): void
    {
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            $table->dropColumn('keywords');
        });
    }
};
