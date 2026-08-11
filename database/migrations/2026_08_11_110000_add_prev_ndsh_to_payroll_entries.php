<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Сүүл цалингийн хүснэгтэд харуулах "эхэн цалин дээр суутгасан НДШ/ХХОАТ".
     *
     * Мөн сар/салбарын эхэн цалингийн тооцооны ndsh баганаас автоматаар татагдана.
     */
    public function up(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->float('prev_ndsh')->default(0)->after('prev_paid');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_entries', function (Blueprint $table) {
            $table->dropColumn('prev_ndsh');
        });
    }
};
