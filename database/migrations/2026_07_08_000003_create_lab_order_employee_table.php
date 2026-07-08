<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Нэг лаб захиалгад олон нугалсан / өнгөлсөн ажилтан оноох pivot
        Schema::create('lab_order_employee', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('role', 20); // bender | polisher
            $table->timestamps();

            $table->unique(['lab_order_id', 'employee_id', 'role']);
            $table->index(['lab_order_id', 'role']);
        });

        // Хуучин ганц баганын өгөгдлийг pivot руу шилжүүлэх
        $now = now();
        DB::table('lab_orders')
            ->where(fn ($q) => $q->whereNotNull('bender_employee_id')->orWhereNotNull('polisher_employee_id'))
            ->orderBy('id')
            ->chunkById(200, function ($rows) use ($now) {
                $insert = [];
                foreach ($rows as $r) {
                    if ($r->bender_employee_id) {
                        $insert[] = ['lab_order_id' => $r->id, 'employee_id' => $r->bender_employee_id, 'role' => 'bender', 'created_at' => $now, 'updated_at' => $now];
                    }
                    if ($r->polisher_employee_id) {
                        $insert[] = ['lab_order_id' => $r->id, 'employee_id' => $r->polisher_employee_id, 'role' => 'polisher', 'created_at' => $now, 'updated_at' => $now];
                    }
                }
                if ($insert) {
                    DB::table('lab_order_employee')->insertOrIgnore($insert);
                }
            });

        // Хуучин ганц баганыг устгах (нэг эх сурвалжтай болгох)
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bender_employee_id');
            $table->dropConstrainedForeignId('polisher_employee_id');
        });
    }

    public function down(): void
    {
        Schema::table('lab_orders', function (Blueprint $table) {
            $table->foreignId('bender_employee_id')->nullable()->after('amount_paid')->constrained('employees')->nullOnDelete();
            $table->foreignId('polisher_employee_id')->nullable()->after('bender_employee_id')->constrained('employees')->nullOnDelete();
        });

        // Эхний ажилтныг буцааж ганц багана руу хуулах
        foreach (DB::table('lab_order_employee')->orderBy('id')->get() as $piv) {
            $col = $piv->role === 'bender' ? 'bender_employee_id' : ($piv->role === 'polisher' ? 'polisher_employee_id' : null);
            if ($col) {
                DB::table('lab_orders')->where('id', $piv->lab_order_id)->whereNull($col)
                    ->update([$col => $piv->employee_id]);
            }
        }

        Schema::dropIfExists('lab_order_employee');
    }
};
