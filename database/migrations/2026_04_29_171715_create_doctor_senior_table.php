<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('doctor_senior', function (Blueprint $table) {
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->foreignId('senior_id')->constrained('doctors')->cascadeOnDelete();
            $table->primary(['doctor_id', 'senior_id']);
        });

        Schema::table('doctors', function (Blueprint $table) {
            $table->dropForeign(['senior_doctor_id']);
            $table->dropColumn('senior_doctor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_senior');

        Schema::table('doctors', function (Blueprint $table) {
            $table->foreignId('senior_doctor_id')
                ->nullable()
                ->constrained('doctors')
                ->nullOnDelete()
                ->after('branch_id');
        });
    }
};
