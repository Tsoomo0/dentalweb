<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ээлжийн загвар — "Ө Өглөө 08:30–16:30" гэх мэт нэг удаа тодорхойлж,
        // хуваарийн нүд бүрт зөвхөн сонгоно. Салбар/албан тушаалаар хязгаарлаж болно.
        Schema::create('shift_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained()->cascadeOnDelete(); // null = бүх салбар
            $table->string('name', 50);
            $table->string('code', 4); // нүдэнд харагдах товчлол, гарын товч
            $table->string('kind', 10)->default('work'); // work | off
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->unsignedSmallInteger('break_minutes')->default(0);
            $table->string('color', 9)->default('#0ea5e9');
            $table->json('position_ids')->nullable(); // null = бүх албан тушаал
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_templates');
    }
};
