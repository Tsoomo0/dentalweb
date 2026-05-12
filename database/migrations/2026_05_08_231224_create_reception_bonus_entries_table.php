<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('reception_bonus_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bonus_run_id')->constrained('reception_bonus_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('registrations')->default(0);
            $table->unsignedInteger('calls_received')->default(0);
            $table->unsignedInteger('call_reminders')->default(0);
            $table->unsignedInteger('complaints')->default(0);
            $table->unsignedInteger('compliments')->default(0);
            $table->unsignedInteger('hubspot_regs')->default(0);
            $table->unsignedInteger('payments')->default(0);
            $table->float('total_amount')->default(0);
            $table->boolean('is_sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('reception_bonus_entries'); }
};
