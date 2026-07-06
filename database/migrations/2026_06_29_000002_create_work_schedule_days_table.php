<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Өдрийн "Хийх ажил" хэсэг — ажилтнаас үл хамаарах өдрийн нэгдсэн төлөвлөгөө
        // (Карт гаргах/хураах, Загварын өрөө хариуцах, Картны нүүр хэвлэх).
        Schema::create('work_schedule_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            $table->json('tasks')->nullable();
            $table->timestamps();

            $table->unique(['branch_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_schedule_days');
    }
};
