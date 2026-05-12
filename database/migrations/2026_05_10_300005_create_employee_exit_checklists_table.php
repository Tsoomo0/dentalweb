<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('employee_exit_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('exit_date')->nullable();
            $table->string('exit_type')->nullable();
            $table->text('reason')->nullable();
            $table->date('notice_date')->nullable();
            $table->text('replacement_plan')->nullable();
            $table->boolean('item_equipment_returned')->default(false);
            $table->boolean('item_badge_returned')->default(false);
            $table->boolean('item_keys_returned')->default(false);
            $table->boolean('item_books_returned')->default(false);
            $table->boolean('item_uniform_returned')->default(false);
            $table->text('notes_property')->nullable();
            $table->boolean('item_system_access_revoked')->default(false);
            $table->boolean('item_email_deactivated')->default(false);
            $table->boolean('item_files_transferred')->default(false);
            $table->text('notes_it')->nullable();
            $table->boolean('item_final_salary_processed')->default(false);
            $table->boolean('item_advances_settled')->default(false);
            $table->boolean('item_insurance_notified')->default(false);
            $table->boolean('item_tax_notified')->default(false);
            $table->text('notes_finance')->nullable();
            $table->boolean('item_handover_completed')->default(false);
            $table->boolean('item_exit_interview_done')->default(false);
            $table->boolean('item_certificate_issued')->default(false);
            $table->boolean('eligible_for_rehire')->default(true);
            $table->text('exit_interview_notes')->nullable();
            $table->text('notes_general')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('employee_exit_checklists'); }
};
