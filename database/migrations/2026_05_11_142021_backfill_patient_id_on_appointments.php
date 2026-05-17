<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite (тестэд) JOIN UPDATE дэмжихгүй тул цөөн query-ээр backfill
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('
                UPDATE appointments a
                JOIN patients p ON p.phone = a.patient_phone
                SET a.patient_id = p.id
                WHERE a.patient_id IS NULL AND a.patient_phone IS NOT NULL
            ');
        } else {
            // SQLite/PostgreSQL portable — патиент бүрд appointments шинэчилнэ
            DB::table('patients')
                ->whereNotNull('phone')
                ->orderBy('id')
                ->chunk(500, function ($patients) {
                    foreach ($patients as $p) {
                        DB::table('appointments')
                            ->whereNull('patient_id')
                            ->where('patient_phone', $p->phone)
                            ->update(['patient_id' => $p->id]);
                    }
                });
        }
    }

    public function down(): void {}
};
