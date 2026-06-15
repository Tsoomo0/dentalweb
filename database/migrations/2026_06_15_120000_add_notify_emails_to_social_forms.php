<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_forms', function (Blueprint $table) {
            // Хариулт ирэхэд мэдэгдэл очих имэйл хаягууд: ["a@x.mn", "b@x.mn"]
            $table->json('notify_emails')->nullable()->after('success_message');
        });
    }

    public function down(): void
    {
        Schema::table('social_forms', function (Blueprint $table) {
            $table->dropColumn('notify_emails');
        });
    }
};
