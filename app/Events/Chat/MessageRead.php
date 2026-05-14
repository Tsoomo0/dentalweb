<?php

namespace App\Events\Chat;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $conversationId,
        public readonly int $userId,
        public readonly int $lastMessageId,
        public readonly string $readAt,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("chat.conversation.{$this->conversationId}")];
    }

    public function broadcastAs(): string
    {
        return 'message.read';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation_id'  => $this->conversationId,
            'user_id'          => $this->userId,
            'last_message_id'  => $this->lastMessageId,
            'read_at'          => $this->readAt,
        ];
    }
}
