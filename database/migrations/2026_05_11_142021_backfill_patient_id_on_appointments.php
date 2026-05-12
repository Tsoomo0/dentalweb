<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        DB::statement("
            UPDATE appointments a
            JOIN patients p ON p.phone = a.patient_phone
            SET a.patient_id = p.id
            WHERE a.patient_id IS NULL AND a.patient_phone IS NOT NULL
        ");
    }
    public function down(): void {}
};
