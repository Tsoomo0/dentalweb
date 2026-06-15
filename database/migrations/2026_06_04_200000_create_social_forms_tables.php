<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_forms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            // [{ key, label, type:text|email|phone|number|textarea|select, required, options:[] }]
            $table->json('fields');
            $table->string('success_message')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('submissions_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('social_form_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_form_id')->constrained('social_forms')->cascadeOnDelete();
            $table->foreignId('social_contact_id')->nullable()->constrained('social_contacts')->nullOnDelete();
            $table->foreignId('social_conversation_id')->nullable()->constrained('social_conversations')->nullOnDelete();
            $table->json('data');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });

        Schema::table('social_flow_buttons', function (Blueprint $table) {
            $table->foreignId('target_form_id')->nullable()->after('target_flow_id')->constrained('social_forms')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('social_flow_buttons', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_form_id');
        });
        Schema::dropIfExists('social_form_submissions');
        Schema::dropIfExists('social_forms');
    }
};
