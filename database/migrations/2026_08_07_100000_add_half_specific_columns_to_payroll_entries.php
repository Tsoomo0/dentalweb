<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Эхэн / сүүл цалингийн хүснэгт тус тусдаа болсонтой холбоотой шинэ баганууд.
     * Хуучин баганууд хэвээр үлдэнэ — өмнөх тооцоонууд задаргаагаа хадгална.
     */
    public function up(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->float('advance_salary')->default(0)->after('nd_salary');
            $table->float('percent_salary')->default(0)->after('ath_bonus');
            $table->float('reward')->default(0)->after('overtime_bonus');
            $table->float('hazard_bonus')->default(0)->after('reward');
            $table->float('food_rate')->default(0)->after('daily_rate');
            $table->float('milk_rate')->default(0)->after('food');
            $table->float('worked_salary')->default(0)->after('total_bonus');
            $table->float('tardy_minutes')->default(0)->after('tardiness');
            $table->float('fingerprint_misses')->default(0)->after('no_fingerprint');
            $table->float('total_deduction')->default(0)->after('other_deduction');
            $table->float('hand_deduction')->default(0)->after('net_hand');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->dropColumn([
                'advance_salary', 'percent_salary', 'reward', 'hazard_bonus',
                'food_rate', 'milk_rate', 'worked_salary',
                'tardy_minutes', 'fingerprint_misses', 'total_deduction',
                'hand_deduction',
            ]);
        });
    }
};
