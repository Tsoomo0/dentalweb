<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branch_doctor', function (Blueprint $table) {
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->primary(['branch_id', 'doctor_id']);
        });

        // Одоо байгаа эмч нарын үндсэн салбарыг pivot-д автоматаар нэмэх
        DB::table('doctors')->whereNotNull('branch_id')->orderBy('id')->each(function ($doctor) {
            DB::table('branch_doctor')->insertOrIgnore([
                'branch_id' => $doctor->branch_id,
                'doctor_id' => $doctor->id,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_doctor');
    }
};
