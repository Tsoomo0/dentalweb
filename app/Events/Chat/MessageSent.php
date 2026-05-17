<?php

namespace App\Events\Chat;

use App\Models\Chat\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Message $message,
        public readonly array $recipientUserIds = [],
    ) {}

    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel("chat.conversation.{$this->message->conversation_id}")];

        foreach ($this->recipientUserIds as $userId) {
            $channels[] = new PrivateChannel("chat.user.{$userId}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        $msg = $this->message->loadMissing(['sender:id,name', 'attachments', 'replyTo:id,body,sender_id', 'botNode']);

        return [
            'message' => [
                'id' => $msg->id,
                'conversation_id' => $msg->conversation_id,
                'sender_id' => $msg->sender_id,
                'sender_type' => $msg->sender_type,
                'sender' => $msg->sender ? ['id' => $msg->sender->id, 'name' => $msg->sender->name] : null,
                'body' => $msg->body,
                'type' => $msg->type,
                'bot_node_id' => $msg->bot_node_id,
                'reply_to_id' => $msg->reply_to_id,
                'reply_to' => $msg->replyTo ? [
                    'id' => $msg->replyTo->id,
                    'body' => $msg->replyTo->body,
                    'sender_id' => $msg->replyTo->sender_id,
                ] : null,
                'meta' => $msg->meta,
                'attachments' => $msg->attachments->map(fn ($a) => [
                    'id' => $a->id,
                    'url' => $a->url,
                    'original_name' => $a->original_name,
                    'mime_type' => $a->mime_type,
                    'size' => $a->size,
                    'width' => $a->width,
                    'height' => $a->height,
                    'is_image' => $a->is_image,
                ])->all(),
                'edited_at' => $msg->edited_at?->toIso8601String(),
                'created_at' => $msg->created_at?->toIso8601String(),
            ],
        ];
    }
}
