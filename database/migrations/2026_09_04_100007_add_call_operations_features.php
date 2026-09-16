<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Дуудлагын үйл ажиллагааны 4 боломж: ажлын цаг, спам, SLA, тайлан.
 *
 * - is_after_hours: ажлын цагаас гадуур ирсэн дуудлага. Тэр үед хэн ч байхгүй
 *   тул "алдсан" гэж ажилтныг буруутгах нь шударга бус — тусад нь тооцно.
 * - is_spam: зар сурталчилгаа, буруу дугаар. Мэдэгдэл өгөхгүй, тайланд орохгүй.
 * - escalated_at: SLA хугацаа хэтэрсэн тухай удирдлагад давхар мэдэгдсэн эсэх.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->boolean('is_after_hours')->default(false)->after('is_missed');
            $table->boolean('is_spam')->default(false)->after('is_after_hours');
            $table->timestamp('escalated_at')->nullable()->after('missed_notified_at');

            // Ресепшний гол дэлгэц: спам биш, ажлын цагийн, шийдэгдээгүй алдсан
            $table->index(['is_missed', 'is_spam', 'handled_at']);
        });

        Schema::create('call_blocked_numbers', function (Blueprint $table) {
            $table->id();
            $table->string('number_norm', 16)->unique();
            $table->string('label')->nullable();
            $table->string('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Тохиргоо — Setting::set() нь одоо байгаа мөрийг л шинэчилдэг тул
        // мөрүүдийг энд үүсгэнэ.
        $now = now();
        $defaults = [
            ['key' => 'call_work_start', 'value' => '09:00', 'label' => 'Ажил эхлэх цаг'],
            ['key' => 'call_work_end', 'value' => '20:00', 'label' => 'Ажил дуусах цаг'],
            ['key' => 'call_work_days', 'value' => '1,2,3,4,5,6', 'label' => 'Ажлын өдрүүд (1=Даваа)'],
            ['key' => 'call_sla_minutes', 'value' => '30', 'label' => 'Алдсан дуудлагыг барих хугацаа (мин)'],
            ['key' => 'call_notify_after_hours', 'value' => '0', 'label' => 'Ажлын цагаас гадуур мэдэгдэл өгөх'],
            ['key' => 'call_report_time', 'value' => '20:30', 'label' => 'Өдрийн тайлан илгээх цаг'],
        ];

        foreach ($defaults as $row) {
            DB::table('settings')->updateOrInsert(
                ['key' => $row['key']],
                [
                    'value' => $row['value'],
                    'group' => 'callpro',
                    'label' => $row['label'],
                    'type' => 'string',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }
    }

    public function down(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->dropIndex(['is_missed', 'is_spam', 'handled_at']);
            $table->dropColumn(['is_after_hours', 'is_spam', 'escalated_at']);
        });

        Schema::dropIfExists('call_blocked_numbers');

        DB::table('settings')->where('group', 'callpro')->delete();
    }
};
