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
        return [new PrivateChannel("daily-sheet.{$this->branchId}.{$this->date}")];
    }

    public function broadcastAs(): string
    {
        return 'sheet.updated';
    }

    public function broadcastWith(): array
    {
        return [];
    }
}
