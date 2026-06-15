<?php

namespace App\Events\Social;

use App\Models\Social\SocialMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Шинэ social мессеж (орсон эсвэл гарсан) — админы inbox-д амьд шинэчилнэ.
 */
class SocialMessageReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly SocialMessage $message) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('social.inbox'),
            new PrivateChannel('social.conversation.'.$this->message->social_conversation_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'social.message';
    }

    public function broadcastWith(): array
    {
        $m = $this->message;

        return [
            'conversation_id' => $m->social_conversation_id,
            'message' => [
                'id' => $m->id,
                'direction' => $m->direction,
                'sender' => $m->sender,
                'type' => $m->type,
                'text' => $m->text,
                'attachments' => $m->attachments,
                'flow_node_id' => $m->flow_node_id,
                'created_at' => $m->created_at?->toIso8601String(),
            ],
        ];
    }
}
