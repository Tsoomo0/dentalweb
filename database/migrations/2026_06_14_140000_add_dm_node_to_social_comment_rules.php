<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_comment_rules', function (Blueprint $table) {
            // Урсгалын тодорхой блокоос эхлэх (хоосон бол урсгалын эхнээс). dm_flow_id-тэй хослон ажиллана.
            $table->unsignedBigInteger('dm_node_id')->nullable()->after('dm_flow_id');
        });
    }

    public function down(): void
    {
        Schema::table('social_comment_rules', function (Blueprint $table) {
            $table->dropColumn('dm_node_id');
        });
    }
};
