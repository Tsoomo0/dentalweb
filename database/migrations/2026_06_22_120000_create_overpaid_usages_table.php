<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overpaid_usages', function (Blueprint $table) {
            $table->id();
            // Илүү тооцооны эх үүсвэр (overpaid_amount > 0 байгаа мөр)
            $table->foreignId('source_entry_id')->constrained('daily_sheet_entries')->cascadeOnDelete();
            // Кредит баланслагдсан зорилтот баримтын дугаар (өнөөдрийн тооцооны мөр)
            $table->string('target_receipt', 100);
            $table->unsignedInteger('amount');
            $table->string('method', 20)->nullable();
            $table->foreignId('used_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('target_receipt');
            $table->index('source_entry_id');
        });

        // Хуучин нэг удаагийн ашиглалтыг шинэ хүснэгт рүү нүүлгэнэ (single source of truth)
        DB::table('daily_sheet_entries')
            ->whereNotNull('overpaid_used_at')
            ->where('overpaid_amount', '>', 0)
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                $now = now();
                $insert = [];
                foreach ($rows as $r) {
                    $insert[] = [
                        'source_entry_id' => $r->id,
                        'target_receipt' => $r->overpaid_used_receipt ?: '',
                        'amount' => (int) ($r->overpaid_used_amount ?: $r->overpaid_amount),
                        'method' => $r->overpaid_used_method,
                        'used_by' => $r->user_id,
                        'created_at' => $r->overpaid_used_at,
                        'updated_at' => $now,
                    ];
                }
                if ($insert) {
                    DB::table('overpaid_usages')->insert($insert);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('overpaid_usages');
    }
};
