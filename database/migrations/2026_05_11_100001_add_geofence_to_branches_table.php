<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('branches', function (Blueprint $table) {
            $table->double('lat')->nullable()->after('order');
            $table->double('lng')->nullable()->after('lat');
            $table->unsignedInteger('radius_m')->nullable()->after('lng');
        });
    }
    public function down(): void {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng', 'radius_m']);
        });
    }
};
