<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('consent_form_templates', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('category')->nullable();
            $table->string('title');
            $table->longText('content')->nullable();
            $table->boolean('requires_guardian')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('consent_form_templates'); }
};
