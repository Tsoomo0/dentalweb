<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ажлын цагийг ГАРАГ БҮРЭЭР тохируулдаг болгоно.
 *
 * Өмнө нь бүх өдөрт нэг ижил `call_work_start` / `call_work_end` үйлчилдэг
 * байсан бөгөөд ажлын өдрүүд нь тусдаа жагсаалт (`call_work_days`) байв.
 * Бодит байдалд бямба гаригт богино ажилладаг тул нэг ерөнхий цаг хангалтгүй.
 *
 * Шинэ бүтэц — `call_work_hours`, JSON:
 *
 *   {"1":{"start":"09:00","end":"20:00"}, "6":{"start":"10:00","end":"16:00"}}
 *
 * Жагсаалтад БАЙХГҮЙ гараг нь амралтын өдөр.
 *
 * Хуучин утгыг алдалгүй хөрвүүлнэ: одоогийн ажлын өдөр бүр одоогийн ерөнхий
 * цагийг өвлөнө. Тиймээс энэ migration-ий дараа зан төлөв ЯГ хэвээр үлдэнэ —
 * админ зөвхөн хүссэн өдрөө засна.
 */
return new class extends Migration
{
    private const DEFAULT_DAYS = '1,2,3,4,5,6';

    private const DEFAULT_START = '09:00';

    private const DEFAULT_END = '20:00';

    public function up(): void
    {
        $start = $this->setting('call_work_start') ?: self::DEFAULT_START;
        $end = $this->setting('call_work_end') ?: self::DEFAULT_END;
        $days = $this->setting('call_work_days') ?: self::DEFAULT_DAYS;

        $hours = [];

        foreach (explode(',', $days) as $day) {
            $day = (int) trim($day);

            if ($day >= 1 && $day <= 7) {
                $hours[(string) $day] = ['start' => $start, 'end' => $end];
            }
        }

        ksort($hours);

        DB::table('settings')->updateOrInsert(
            ['key' => 'call_work_hours'],
            [
                'value' => json_encode($hours ?: $this->defaultHours()),
                'group' => 'callpro',
                'label' => 'Ажлын цаг (гараг бүрээр)',
                'type' => 'string',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        DB::table('settings')
            ->whereIn('key', ['call_work_start', 'call_work_end', 'call_work_days'])
            ->delete();
    }

    /**
     * Буцаахдаа хамгийн эрт эхэлдэг өдрийн цагийг ерөнхий цаг болгоно —
     * гараг бүрийн ялгааг хадгалах газар хуучин бүтцэд байхгүй.
     */
    public function down(): void
    {
        $hours = json_decode((string) $this->setting('call_work_hours'), true);
        $hours = is_array($hours) && $hours !== [] ? $hours : $this->defaultHours();

        $first = reset($hours);
        $now = now();

        $rows = [
            'call_work_start' => [$first['start'] ?? self::DEFAULT_START, 'Ажил эхлэх цаг'],
            'call_work_end' => [$first['end'] ?? self::DEFAULT_END, 'Ажил дуусах цаг'],
            'call_work_days' => [implode(',', array_keys($hours)), 'Ажлын өдрүүд (1=Даваа)'],
        ];

        foreach ($rows as $key => [$value, $label]) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                [
                    'value' => $value,
                    'group' => 'callpro',
                    'label' => $label,
                    'type' => 'string',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        DB::table('settings')->where('key', 'call_work_hours')->delete();
    }

    private function setting(string $key): ?string
    {
        $value = DB::table('settings')->where('key', $key)->value('value');

        return $value === null ? null : trim((string) $value);
    }

    /** @return array<string,array{start:string,end:string}> */
    private function defaultHours(): array
    {
        $hours = [];

        foreach (range(1, 6) as $day) {
            $hours[(string) $day] = ['start' => self::DEFAULT_START, 'end' => self::DEFAULT_END];
        }

        return $hours;
    }
};
