<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_contacts', function (Blueprint $table) {
            // Хүйс — 'male' / 'female' / null (тодорхойгүй).
            // Meta API чатын хэрэглэгчийн хүйсийг өгдөггүй тул best-effort:
            // нэрээр таамаглах эсвэл оператор гараар оноох.
            $table->string('gender', 10)->nullable()->after('username');
        });
    }

    public function down(): void
    {
        Schema::table('social_contacts', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }
};
