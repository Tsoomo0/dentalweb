<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Queue-г салбарын json талбараас гаргаж бие даасан хүснэгт болгоно.
 *
 * Шалтгаан: CallPro-гийн бүх queue салбарт харьяалагддаггүй. "Medeelel avah"
 * гэх мэт queue-д бүх салбарын үйлчлүүлэгч ордог тул нэг салбарт хамааруулах
 * боломжгүй. json жагсаалт дээр "салбаргүй" гэдгийг илэрхийлэх арга байхгүй
 * байсан тул ийм queue админ талд үүрд "бүртгэгдээгүй" гэж анхааруулаад
 * байх байсан — үнэн анхааруулга дунд нь дарагдана.
 *
 * Одоо call_extensions-тэй ижил бүтэцтэй боллоо: branch_id = NULL нь
 * "зориуд салбаргүй" гэсэн утгатай.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_queues', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120)->unique();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('branch_id');
        });

        // Одоо байгаа тохиргоог алдалгүй шилжүүлнэ.
        foreach (DB::table('branches')->whereNotNull('callpro_queues')->get(['id', 'callpro_queues']) as $branch) {
            foreach ((array) json_decode((string) $branch->callpro_queues, true) as $name) {
                $name = trim((string) $name);

                if ($name === '') {
                    continue;
                }

                DB::table('call_queues')->insertOrIgnore([
                    'name' => $name,
                    'branch_id' => $branch->id,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('callpro_queues');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->json('callpro_queues')->nullable()->after('phone');
        });

        foreach (DB::table('call_queues')->whereNotNull('branch_id')->get() as $queue) {
            $existing = (array) json_decode(
                (string) DB::table('branches')->where('id', $queue->branch_id)->value('callpro_queues'),
                true,
            );

            DB::table('branches')->where('id', $queue->branch_id)->update([
                'callpro_queues' => json_encode([...$existing, $queue->name]),
            ]);
        }

        Schema::dropIfExists('call_queues');
    }
};
