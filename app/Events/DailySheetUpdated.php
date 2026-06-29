<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DailySheetUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $branchId,
        public readonly string $date,
    ) {}

    public function broadcastOn(): array
    {
        return [
            // Reception — тухайн салбар+огнооны суваг
            new PrivateChannel("daily-sheet.{$this->branchId}.{$this->date}"),
            // Admin — бүх салбар/огнооны ерөнхий суваг
            new PrivateChannel('daily-sheets-admin'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'sheet.updated';
    }

    public function broadcastWith(): array
    {
        return ['branchId' => $this->branchId, 'date' => $this->date];
    }

    /**
     * Request-scoped цуглуулга — нэг хүсэлтэд хэдэн ч мөр өөрчлөгдсөн ч
     * branch+date тус бүрд яг нэг л удаа (хариу буцсаны дараа) broadcast хийнэ.
     * Ингэснээр bulk save үед олон broadcast үүсэхгүй, Reverb унасан ч хүсэлт эвдрэхгүй.
     */
    protected static array $pending = [];

    protected static bool $registered = false;

    public static function mark(?int $branchId, string|\DateTimeInterface|null $date): void
    {
        if (! $branchId || ! $date) {
            return;
        }

        $d = $date instanceof \DateTimeInterface ? $date->format('Y-m-d') : substr((string) $date, 0, 10);
        static::$pending["{$branchId}|{$d}"] = [$branchId, $d];

        if (! static::$registered) {
            static::$registered = true;
            app()->terminating(function () {
                $batch = static::$pending;
                static::$pending = [];
                foreach ($batch as [$b, $dd]) {
                    try {
                        broadcast(new self($b, $dd));
                    } catch (\Throwable $e) {
                        report($e);
                    }
                }
            });
        }
    }
}
