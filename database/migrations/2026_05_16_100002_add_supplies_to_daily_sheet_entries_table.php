<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->unsignedSmallInteger('supply_orthodontic_brush')->default(0)->after('doctor_id');
            $table->unsignedSmallInteger('supply_interdental_brush')->default(0)->after('supply_orthodontic_brush');
            $table->unsignedSmallInteger('supply_dental_floss')->default(0)->after('supply_interdental_brush');
            $table->unsignedSmallInteger('supply_wax')->default(0)->after('supply_dental_floss');
            $table->unsignedSmallInteger('supply_retainer_case')->default(0)->after('supply_wax');
            $table->unsignedSmallInteger('supply_removable_app_case')->default(0)->after('supply_retainer_case');
            $table->string('entry_notes', 500)->nullable()->after('supply_removable_app_case');
        });
    }

    public function down(): void
    {
        Schema::table('daily_sheet_entries', function (Blueprint $table) {
            $table->dropColumn([
                'supply_orthodontic_brush',
                'supply_interdental_brush',
                'supply_dental_floss',
                'supply_wax',
                'supply_retainer_case',
                'supply_removable_app_case',
                'entry_notes',
            ]);
        });
    }
};
