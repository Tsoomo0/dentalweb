<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('overpaid_usages', function (Blueprint $table) {
            // Аль өдрийн тооцоонд баланслагдсаныг тэмдэглэнэ.
            // Өмнө нь created_at-аар өдрийг таамагладаг байсан тул
            // өнгөрсөн өдөрт ашиглах боломжгүй байв.
            $table->date('target_date')->nullable()->after('target_receipt');
        });

        // Хуучин мөрүүд: ашигласан огноо = бүртгэсэн огноо
        DB::table('overpaid_usages')
            ->whereNull('target_date')
            ->update(['target_date' => DB::raw('DATE(created_at)')]);

        Schema::table('overpaid_usages', function (Blueprint $table) {
            $table->index(['target_receipt', 'target_date']);
        });
    }

    public function down(): void
    {
        Schema::table('overpaid_usages', function (Blueprint $table) {
            $table->dropIndex(['target_receipt', 'target_date']);
            $table->dropColumn('target_date');
        });
    }
};
