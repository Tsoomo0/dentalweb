<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * CallPro-гийн queue нэрийг бодит утгаар нь залруулна.
 *
 * Анх queue нь дүүргийн нэрээр (Bayanzurkh, Khan-Uul ...) ирнэ гэж таамагласан
 * боловч бодит webhook-оос үзэхэд CallPro нь IVR цэсэнд ДАРСАН ТОВЧИЙГ queue
 * нэр болгон илгээдэг байв:
 *
 *   { "number": "80141889", "queue_name": "3" }    ← 3 = Цамбагарав
 *
 * Таамаг буруу байсан тул алдсан дуудлага бүр «салбар тодорхойгүй» болж,
 * ресепшний жагсаалт ч, дэлгэцийн сануулга ч хүрэхгүй байв.
 *
 * Шинээр мөр үүсгэхгүй, БАЙГАА мөрийн нэрийг л солино. Ингэснээр админы
 * гараар өөрчилсөн салбарын харьяалал хэвээр үлдэх бөгөөд шинэ суурилуулалтад
 * (queue огт байхгүй) энэ migration юу ч хийхгүй — тэнд CallProSeeder ажиллана.
 */
return new class extends Migration
{
    /** Буруу таамаг → бодит IVR товч. */
    private const RENAME = [
        'Bayanzurkh' => '1',        // Сансар
        'Bayangol' => '2',          // Хороолол
        'Songinokhairkhan' => '3',  // Цамбагарав
        'Khan-Uul' => '4',          // Яармаг
        'Medeelel avah' => '0',     // мэдээлэл авах — зориуд салбаргүй
    ];

    public function up(): void
    {
        $this->renameGuesses();
        $this->backfillCalls();
    }

    /**
     * Буцаахгүй. Хуучин нэрс эхнээсээ буруу байсан тул сэргээх нь салбарын
     * хуваарилалтыг дахин эвдэнэ гэсэн үг.
     */
    public function down(): void
    {
        //
    }

    private function renameGuesses(): void
    {
        foreach (self::RENAME as $guess => $digit) {
            $row = DB::table('call_queues')->where('name', $guess)->first();

            if ($row === null) {
                continue;
            }

            // Админ товчийг аль хэдийн гараар нэмсэн бол түүнийх нь эрх дээгүүр
            // — хуучин таамгийг зүгээр л хаяна.
            if (DB::table('call_queues')->where('name', $digit)->exists()) {
                DB::table('call_queues')->where('id', $row->id)->delete();

                continue;
            }

            DB::table('call_queues')->where('id', $row->id)->update([
                'name' => $digit,
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Аль хэдийн бүртгэгдсэн дуудлагыг ч залруулна.
     *
     * Эдгээр нь «салбар тодорхойгүй» гэж хадгалагдсан учраас ресепшний
     * жагсаалтад огт ороогүй. Queue нь мэдэгдэж байгаа тул одоо хуваарилж
     * болно — ингэснээр эргэж залгагдаагүй дуудлага нүдэнд ирнэ.
     */
    private function backfillCalls(): void
    {
        $queues = DB::table('call_queues')
            ->whereIn('name', array_values(self::RENAME))
            ->whereNotNull('branch_id')
            ->get(['name', 'branch_id']);

        foreach ($queues as $queue) {
            DB::table('calls')
                ->whereNull('branch_id')
                ->where('queue_name', $queue->name)
                ->update(['branch_id' => $queue->branch_id]);
        }
    }
};
