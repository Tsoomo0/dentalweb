<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('patient_last_name')->nullable()->after('patient_name');
            $table->string('patient_first_name')->nullable()->after('patient_last_name');
        });

        // Хуучин patient_name-ийг овог/нэр болгож хуваана
        DB::table('appointments')->orderBy('id')->chunkById(500, function ($rows) {
            foreach ($rows as $r) {
                $full = trim((string) $r->patient_name);
                if ($full === '') continue;

                $parts = preg_split('/\s+/u', $full, 2);
                $last  = $parts[0] ?? null;
                $first = $parts[1] ?? null;

                // Нэг үг бол бүгдийг нэр гэж үзнэ
                if (!$first) { $first = $last; $last = null; }

                DB::table('appointments')->where('id', $r->id)->update([
                    'patient_last_name'  => $last,
                    'patient_first_name' => $first,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['patient_last_name', 'patient_first_name']);
        });
    }
};
