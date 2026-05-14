<?php

namespace App\Events\Chat;

use App\Models\Chat\Handoff;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HandoffRequested implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Handoff $handoff) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.handoff-inbox')];
    }

    public function broadcastAs(): string
    {
        return 'handoff.requested';
    }

    public function broadcastWith(): array
    {
        $h = $this->handoff->loadMissing(['user:id,name', 'botConversation']);

        return [
            'id'                  => $h->id,
            'bot_conversation_id' => $h->bot_conversation_id,
            'user'                => $h->user ? ['id' => $h->user->id, 'name' => $h->user->name] : null,
            'reason'              => $h->reason,
            'status'              => $h->status,
            'created_at'          => $h->created_at?->toIso8601String(),
        ];
    }
}
