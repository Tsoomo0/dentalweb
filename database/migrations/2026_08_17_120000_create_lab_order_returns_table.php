<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Буцаалтын түүх — мөчлөг бүрт нэг мөр.
     *
     * lab_orders дээрх return_* багана нь "сүүлийн буцаалтын" төлөв хэвээр
     * үлдэнэ (шүүлтүүр, badge хурдан ажиллуулах), харин шалтгаан, огноо,
     * ажилтан зэрэг бүрэн мэдээлэл энд хуримтлагдана. Ингэснээр нэг ажил
     * 2, 3 удаа буцаалаа ч өмнөх бүртгэл дарагдахгүй, "ямар ажил их
     * буцаагддаг вэ" гэдгийг бүрэн харах боломжтой болно.
     */
    public function up(): void
    {
        Schema::create('lab_order_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->unsignedSmallInteger('attempt');            // хэд дэх удаагийн буцаалт
            $table->text('reason');
            $table->timestamp('returned_at');
            $table->foreignId('returned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('ready_date')->nullable();             // лаб янзалж дуусгасан
            $table->timestamp('closed_at')->nullable();         // ресепшн хүлээж авсан
            $table->timestamp('cancelled_at')->nullable();      // андуурч үүсгэснийг цуцалсан
            $table->timestamps();

            $table->unique(['lab_order_id', 'attempt']);
            $table->index('returned_at');
        });

        Schema::create('lab_order_return_employee', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_order_return_id')->constrained('lab_order_returns')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('role', 20);                          // bender | polisher
            $table->timestamps();

            $table->unique(['lab_order_return_id', 'employee_id', 'role'], 'lor_emp_role_unique');
            $table->index(['lab_order_return_id', 'role']);
        });

        // ── Одоо байгаа буцаалтуудыг түүх рүү зөөх ──────────────────────────
        $now = now();
        DB::table('lab_orders')
            ->where(fn ($q) => $q->where('return_count', '>', 0)->orWhereNotNull('return_status'))
            ->orderBy('id')
            ->get()
            ->each(function ($o) use ($now) {
                $returnId = DB::table('lab_order_returns')->insertGetId([
                    'lab_order_id' => $o->id,
                    'attempt'      => max(1, (int) $o->return_count),
                    'reason'       => $o->return_reason ?? '—',
                    'returned_at'  => $o->returned_at ?? $o->updated_at ?? $now,
                    'returned_by'  => $o->returned_by,
                    'ready_date'   => $o->return_ready_date,
                    'closed_at'    => $o->return_closed_at,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);

                // Буцаалтын ажилтнуудыг шинэ pivot руу
                $rows = DB::table('lab_order_employee')
                    ->where('lab_order_id', $o->id)
                    ->whereIn('role', ['return_bender', 'return_polisher'])
                    ->get();

                foreach ($rows as $r) {
                    DB::table('lab_order_return_employee')->insertOrIgnore([
                        'lab_order_return_id' => $returnId,
                        'employee_id'         => $r->employee_id,
                        'role'                => $r->role === 'return_bender' ? 'bender' : 'polisher',
                        'created_at'          => $r->created_at ?? $now,
                        'updated_at'          => $r->updated_at ?? $now,
                    ]);
                }
            });

        // Хуучин role-уудыг цэвэрлэнэ — нэг эх сурвалжтай болгоно
        DB::table('lab_order_employee')->whereIn('role', ['return_bender', 'return_polisher'])->delete();
    }

    public function down(): void
    {
        // Түүхээс буцааж lab_order_employee руу (сүүлийн мөчлөг)
        $now = now();
        foreach (DB::table('lab_order_returns')->orderBy('attempt')->get() as $ret) {
            $emps = DB::table('lab_order_return_employee')->where('lab_order_return_id', $ret->id)->get();
            foreach ($emps as $e) {
                DB::table('lab_order_employee')->insertOrIgnore([
                    'lab_order_id' => $ret->lab_order_id,
                    'employee_id'  => $e->employee_id,
                    'role'         => $e->role === 'bender' ? 'return_bender' : 'return_polisher',
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);
            }
        }

        Schema::dropIfExists('lab_order_return_employee');
        Schema::dropIfExists('lab_order_returns');
    }
};
