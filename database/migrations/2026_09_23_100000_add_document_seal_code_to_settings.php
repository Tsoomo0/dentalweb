<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'document_seal_code'],
            [
                'value' => '1234',
                'group' => 'system',
                'label' => 'Тамга / гарын үсгийн хамгаалалтын код',
                'description' => 'Байгууллагын тамга солих, захирлын гарын үсэг зурахад шаардагдах PIN код',
                'type' => 'password',
                'is_sensitive' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'document_seal_code')->delete();
    }
};
