<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->boolean('payroll_counted')->default(false)->after('is_completed'); // цалин бодогдсон
            $table->timestamp('payroll_counted_at')->nullable()->after('payroll_counted');
            $table->foreignId('payroll_counted_by')->nullable()->after('payroll_counted_at')
                ->constrained('users')->nullOnDelete();
            $table->index('payroll_counted');
        });
    }

    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payroll_counted_by');
            $table->dropIndex(['payroll_counted']);
            $table->dropColumn(['payroll_counted', 'payroll_counted_at']);
        });
    }
};
