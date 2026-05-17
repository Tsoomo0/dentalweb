<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'daily_sheet_code'],
            [
                'value' => '1234',
                'group' => 'system',
                'label' => 'Өдрийн тооцооны хамгаалалтын код',
                'description' => 'Тооцоо устгах, нээхэд шаардагдах PIN код',
                'type' => 'password',
                'is_sensitive' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'daily_sheet_code')->delete();
    }
};
