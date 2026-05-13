<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('ortho_appliance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->enum('appliance_type', ['removable', 'fixed'])->default('fixed');
            $table->string('archive_code')->nullable();
            $table->string('card_number')->nullable();
            $table->string('register_number')->nullable();
            $table->string('last_name');
            $table->string('first_name');
            $table->string('phone')->nullable();
            $table->date('attached_date')->nullable();
            $table->date('removed_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }
    public function down(): void {
        Schema::dropIfExists('ortho_appliance_records');
    }
};
