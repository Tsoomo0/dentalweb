<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Баталгаажсан цахим гэрээг ажилтны «Хөдөлмөрийн гэрээ» хэсэгт холбоно.
 *
 * Гар аргаар оруулсан гэрээ (file_path) хэвээр үлдэх ба цахим гэрээнээс
 * үүссэн мөр нь document_id-гаараа ялгагдана.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_contracts', function (Blueprint $table) {
            $table->foreignId('document_id')->nullable()->after('employee_id')
                ->constrained('hr_employee_documents')->nullOnDelete();
            // Цахим гэрээний гарчиг — «Хөдөлмөрийн гэрээ», «Нууц хадгалах гэрээ» г.м.
            $table->string('title')->nullable()->after('contract_type');
            $table->unique('document_id');
        });

        $this->backfill();
    }

    /** Өмнө нь баталгаажсан гэрээнүүдийг ажилтан дээр нь буулгана. */
    private function backfill(): void
    {
        $documents = DB::table('hr_employee_documents')
            ->where('status', 'completed')
            ->whereNull('deleted_at')
            ->whereNotIn('type', ['job_description'])
            ->get(['id', 'employee_id', 'type', 'title', 'effective_date', 'expires_at', 'completed_at', 'notes']);

        foreach ($documents as $doc) {
            DB::table('employee_contracts')->insert([
                'employee_id' => $doc->employee_id,
                'document_id' => $doc->id,
                'contract_type' => $doc->expires_at ? 'fixed' : 'indefinite',
                'title' => $doc->title,
                'start_date' => $doc->effective_date ?: ($doc->completed_at ? substr($doc->completed_at, 0, 10) : null),
                'end_date' => $doc->expires_at,
                'notes' => $doc->notes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('employee_contracts')->whereNotNull('document_id')->delete();

        Schema::table('employee_contracts', function (Blueprint $table) {
            $table->dropUnique(['document_id']);
            $table->dropForeign(['document_id']);
            $table->dropColumn(['document_id', 'title']);
        });
    }
};
