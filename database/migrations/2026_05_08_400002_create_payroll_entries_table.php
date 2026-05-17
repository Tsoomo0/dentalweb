<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->float('basic_salary')->default(0);
            $table->float('nd_salary')->default(0);
            $table->float('prev_paid')->default(0);
            $table->float('holiday_advance')->default(0);
            $table->float('ath_bonus')->default(0);
            $table->float('overtime_bonus')->default(0);
            $table->float('vacation_pay')->default(0);
            $table->unsignedTinyInteger('working_days')->default(0);
            $table->float('worked_days')->default(0);
            $table->float('daily_rate')->default(0);
            $table->float('food')->default(0);
            $table->float('transport')->default(0);
            $table->float('milk')->default(0);
            $table->float('total_bonus')->default(0);
            $table->float('calc_salary')->default(0);
            $table->float('nd_total')->default(0);
            $table->float('ndsh')->default(0);
            $table->float('tardiness')->default(0);
            $table->float('no_fingerprint')->default(0);
            $table->float('other_deduction')->default(0);
            $table->float('income_tax')->default(0);
            $table->float('net_hand')->default(0);
            $table->float('bank_salary')->default(0);
            $table->boolean('is_sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_entries');
    }
};
