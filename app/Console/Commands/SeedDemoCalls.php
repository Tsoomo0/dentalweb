<?php

namespace App\Console\Commands;

use App\Jobs\CallPro\ProcessCallEvent;
use App\Models\CallPro\Call;
use App\Models\CallPro\CallEvent;
use App\Models\CallPro\CallExtension;
use App\Models\CallPro\CallQueue;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Туршилтын дуудлага үүсгэнэ — CallPro холбогдохоос өмнө системийг үзэх, турших.
 *
 *   php artisan calls:demo           тест дуудлага нэмнэ
 *   php artisan calls:demo --clear   зөвхөн устгана
 *
 * Бодит webhook-той ЯГ ижил замаар явна: түүхий event хадгалагдаж,
 * ProcessCallEvent боловсруулж, салбар тодорхойлогдож, алдсан
 * дуудлагад мэдэгдэл үүснэ. Тиймээс энд харагдсан зүйл бодит дээр ч
 * яг адилхан ажиллана.
 *
 * Бүх тест дуудлага `demo.` угтвартай unique_id-тай тул --clear нь
 * зөвхөн эдгээрийг устгана — бодит дата хөндөгдөхгүй.
 */
class SeedDemoCalls extends Command
{
    protected $signature = 'calls:demo {--clear : Зөвхөн тест дуудлагыг устгах}';

    protected $description = 'Туршилтын дуудлага үүсгэх (мэдэгдэл, жагсаалт, тайланг үзэх)';

    private const PREFIX = 'demo.';

    public function handle(): int
    {
        $removed = $this->clear();
        $this->info("Өмнөх тест дуудлага устгав: {$removed}");

        if ($this->option('clear')) {
            return self::SUCCESS;
        }

        $queue = CallQueue::whereNotNull('branch_id')->orderBy('id')->first();
        $extensions = CallExtension::whereNotNull('branch_id')->orderBy('extension')->pluck('extension');

        if (! $queue || $extensions->isEmpty()) {
            $this->error('Эхлээд тохиргоо хийнэ үү: php artisan db:seed --class=CallProSeeder');

            return self::FAILURE;
        }

        $this->line("Queue: {$queue->name} · дугаарууд: ".$extensions->implode(', '));
        $this->newLine();

        $n = 0;

        // ── Хариулсан дуудлагууд ────────────────────────────────────────────
        $n += $this->answered('99118844', $extensions->first(), 192, now()->subHours(2));
        $n += $this->answered('88001122', $extensions->get(1) ?? $extensions->first(), 74, now()->subMinutes(95));
        $n += $this->answered('95551122', $extensions->first(), 41, now()->subMinutes(18));

        // ── Алдсан — сүүлийн цагт, тул МЭДЭГДЭЛ үүснэ ───────────────────────
        $n += $this->abandoned('99223344', $queue->name, now()->subMinutes(11));
        $n += $this->noAnswer('88776655', $extensions->first(), now()->subMinutes(26));

        // ── Давтан залгасан — «3 дахь удаа» гэж мэдэгдэнэ ───────────────────
        foreach ([38, 22, 6] as $ago) {
            $n += $this->abandoned('94445566', $queue->name, now()->subMinutes($ago));
        }

        // ── Ажлын цагаас гадуур — тэмдэглэгдэнэ, гэхдээ мэдэгдэл ӨГӨХГҮЙ ────
        $n += $this->abandoned('99887766', $queue->name, now()->subDay()->setTime(23, 40));

        $this->newLine();
        $this->info("{$n} тест дуудлага үүслээ.");
        $this->table(
            ['Төлөв', 'Тоо'],
            [
                ['Нийт', Call::where('unique_id', 'like', self::PREFIX.'%')->orWhereIn('id', $this->demoIds())->count()],
                ['Алдсан', Call::whereIn('id', $this->demoIds())->where('is_missed', true)->count()],
                ['Шийдэгдээгүй', Call::whereIn('id', $this->demoIds())->unhandledMissed()->count()],
                ['Ажлын цагаас гадуур', Call::whereIn('id', $this->demoIds())->where('is_after_hours', true)->count()],
            ],
        );

        $this->newLine();
        $this->line('Харах:  /admin/calls  ·  /admin/calls/dashboard  ·  /reception/calls');
        $this->line('Устгах: php artisan calls:demo --clear');

        return self::SUCCESS;
    }

    /** Тест дуудлагын id-ууд — abandoned дээр unique_id байхгүй тул event-ээр олно. */
    private function demoIds(): array
    {
        return CallEvent::where('source', 'demo')->whereNotNull('call_id')->pluck('call_id')->unique()->all();
    }

    private function clear(): int
    {
        $ids = $this->demoIds();

        CallEvent::where('source', 'demo')->delete();

        return $ids === [] ? 0 : Call::whereIn('id', $ids)->delete();
    }

    /** Хариулсан дуудлага — start → answered → end гурван event. */
    private function answered(string $number, string $agent, int $talk, Carbon $at): int
    {
        $uid = self::PREFIX.$at->getTimestamp().'.'.$number;

        $this->fire('start', ['unique_id' => $uid, 'number' => $number, 'call_type' => 'inbound',
            'call_date' => $at->format('Y-m-d H:i:s')]);

        $this->fire('answered', ['unique_id' => $uid, 'number' => $number, 'call_type' => 'inbound',
            'agent' => $agent, 'call_status' => 'ANSWERED',
            'call_date' => $at->copy()->addSeconds(6)->format('Y-m-d H:i:s'),
            'call_record' => 'https://cdr.callpro.mn/records/'.$uid]);

        $this->fire('end', ['unique_id' => $uid, 'number' => $number, 'call_type' => 'inbound',
            'agent' => $agent, 'call_status' => 'ANSWERED', 'duration' => $talk + 6, 'talk_time' => $talk,
            'call_date' => $at->copy()->addSeconds($talk + 6)->format('Y-m-d H:i:s'),
            'call_record' => 'https://cdr.callpro.mn/records/'.$uid]);

        $this->line("  ✓ {$at->format('H:i')}  {$number} → {$agent} хариулав (".gmdate('i:s', $talk).')');

        return 1;
    }

    /** Дараалалд хүлээгээд таслав — дотуур дугаар ирдэггүй. */
    private function abandoned(string $number, string $queue, Carbon $at): int
    {
        $this->fire('start', ['unique_id' => self::PREFIX.$at->getTimestamp().'.'.$number,
            'number' => $number, 'call_type' => 'inbound', 'call_date' => $at->format('Y-m-d H:i:s')]);

        $this->fire('abandoned', ['number' => $number, 'queue_name' => $queue,
            'call_date' => $at->copy()->addSeconds(22)->format('Y-m-d H:i:s')]);

        $this->line("  ✗ {$at->format('H:i')}  {$number} — дараалалд таслав ({$queue})");

        return 1;
    }

    /** Хонх дуугарсан ч хариулаагүй. */
    private function noAnswer(string $number, string $agent, Carbon $at): int
    {
        $uid = self::PREFIX.$at->getTimestamp().'.'.$number;

        $this->fire('start', ['unique_id' => $uid, 'number' => $number, 'call_type' => 'inbound',
            'call_date' => $at->format('Y-m-d H:i:s')]);

        $this->fire('end', ['unique_id' => $uid, 'number' => $number, 'call_type' => 'inbound',
            'agent' => $agent, 'call_status' => 'NO ANSWER', 'duration' => 0,
            'call_date' => $at->copy()->addSeconds(30)->format('Y-m-d H:i:s')]);

        $this->line("  ✗ {$at->format('H:i')}  {$number} — {$agent} хариулсангүй");

        return 1;
    }

    /** Түүхий event үүсгээд бодит job-оор боловсруулна. */
    private function fire(string $event, array $payload): void
    {
        $row = CallEvent::create([
            'event' => $event,
            'payload' => $payload,
            'source' => 'demo',
            'ip' => '127.0.0.1',
            'received_at' => now(),
        ]);

        ProcessCallEvent::dispatchSync($row->id);
    }
}
