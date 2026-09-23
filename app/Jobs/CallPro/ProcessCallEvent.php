<?php

namespace App\Jobs\CallPro;

use App\Models\CallPro\CallEvent;
use App\Services\CallPro\CallEventNormalizer;
use App\Services\CallPro\CallIngestor;
use App\Services\CallPro\MissedCallNotifier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Хадгалагдсан түүхий event-ийг боловсруулж `calls` хүснэгтэд буулгана.
 *
 * Түүхий бичлэг нь webhook хүлээн авмагц үүссэн байдаг тул энд алдаа гарсан ч
 * дата алдагдахгүй — засаад дахин боловсруулах боломжтой.
 */
class ProcessCallEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 10;

    public function __construct(public readonly int $callEventId) {}

    public function handle(
        CallEventNormalizer $normalizer,
        CallIngestor $ingestor,
        MissedCallNotifier $notifier,
    ): void {
        $event = CallEvent::find($this->callEventId);

        if (! $event || $event->processed) {
            return;
        }

        try {
            $data = $normalizer->normalize(
                $event->payload,
                $event->event === 'auto' ? null : $event->event,
            );

            // Хэдэн хоногийн өмнөх огноотой бол түүхэн дата гэж үзнэ. Ингэснээр
            // 6 сарын дата оруулах үед мэдэгдэл дэлбэрэхээс сэргийлнэ (CallPro
            // түүнийг ч бас webhook-оор нэг бүрчлэн илгээнэ гэсэн).
            $source = $event->source;
            if ($source === 'realtime' && $data['call_date']?->lt(now()->subDays(2))) {
                $source = 'backfill';
            }

            $call = $ingestor->ingest($data, $source);

            $event->forceFill([
                'call_id' => $call->id,
                'event' => $data['event'],
                'unique_id' => $data['unique_id'],
                'source' => $source,
                'processed' => true,
                'error' => null,
            ])->save();

            // Салбар нь хожим тодорхойлогдсон бол тухайн салбарын ажилтнууд
            // мэдэгдэл аваагүй үлдсэн байна — тэдэнд нөхөж илгээнэ.
            $notifier->notify($call, branchOnly: $ingestor->branchJustResolved);
        } catch (\Throwable $e) {
            $event->forceFill(['error' => substr($e->getMessage(), 0, 1000)])->save();

            throw $e;
        }
    }
}
