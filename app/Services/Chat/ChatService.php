<?php

namespace App\Services\Chat;

use App\Events\Chat\ConversationUpdated;
use App\Events\Chat\MessageRead as MessageReadEvent;
use App\Events\Chat\MessageSent;
use App\Services\Chat\PushService;
use App\Models\Chat\Attachment;
use App\Models\Chat\Conversation;
use App\Models\Chat\Message;
use App\Models\Chat\MessageRead;
use App\Models\Chat\Participant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChatService
{
    /**
     * Get or create a direct conversation between two users.
     */
    public function findOrCreateDirect(User $a, User $b): Conversation
    {
        if ($a->id === $b->id) {
            abort(422, 'Өөртэйгөө чат үүсгэх боломжгүй.');
        }

        $existing = Conversation::query()
            ->where('type', Conversation::TYPE_DIRECT)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $a->id))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $b->id))
            ->first();

        if ($existing) {
            // Ensure both participants are active (re-join if they previously left).
            $this->addParticipants($existing, [$a->id, $b->id]);
            return $existing;
        }

        return DB::transaction(function () use ($a, $b) {
            $conv = Conversation::create([
                'type'       => Conversation::TYPE_DIRECT,
                'created_by' => $a->id,
            ]);

            $this->addParticipants($conv, [$a->id, $b->id]);

            return $conv;
        });
    }

    /**
     * Get or create the bot conversation for a user (one per user, persistent).
     */
    public function findOrCreateBotForUser(User $user): Conversation
    {
        $existing = Conversation::query()
            ->where('type', Conversation::TYPE_BOT)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
            ->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($user) {
            $conv = Conversation::create([
                'type'       => Conversation::TYPE_BOT,
                'created_by' => $user->id,
            ]);

            $this->addParticipants($conv, [$user->id]);

            return $conv;
        });
    }

    /**
     * Find or create the support group conversation for an employee — includes the employee
     * and every active admin user. Reused on subsequent handoffs so a single thread persists.
     */
    public function findOrCreateSupportConversation(User $employee): Conversation
    {
        $existing = Conversation::query()
            ->where('type', Conversation::TYPE_GROUP)
            ->whereJsonContains('meta->support_for_user_id', $employee->id)
            ->first();

        $adminIds = User::query()
            ->whereHas('role', fn ($q) => $q->whereIn('name', ['admin']))
            ->where('is_active', true)
            ->pluck('id')
            ->all();

        if ($existing) {
            // Ensure all current admins are participants (admin set may have changed).
            $this->addParticipants($existing, array_merge($adminIds, [$employee->id]));
            return $existing;
        }

        return DB::transaction(function () use ($employee, $adminIds) {
            $conv = Conversation::create([
                'type'       => Conversation::TYPE_GROUP,
                'name'       => $employee->name ?? ('#' . $employee->id), // raw name; display is overridden per viewer in API
                'created_by' => $employee->id,
                'meta'       => ['support_for_user_id' => $employee->id],
            ]);

            $this->addParticipants($conv, array_merge($adminIds, [$employee->id]), ownerId: $employee->id);

            return $conv;
        });
    }

    /**
     * Create a group conversation. Only admins/HR should call this.
     */
    public function createGroup(User $creator, string $name, array $userIds, ?string $avatar = null): Conversation
    {
        $userIds = collect($userIds)->push($creator->id)->unique()->values()->all();

        return DB::transaction(function () use ($creator, $name, $userIds, $avatar) {
            $conv = Conversation::create([
                'type'       => Conversation::TYPE_GROUP,
                'name'       => $name,
                'avatar'     => $avatar,
                'created_by' => $creator->id,
            ]);

            $this->addParticipants($conv, $userIds, ownerId: $creator->id);

            return $conv;
        });
    }

    public function addParticipants(Conversation $conv, array $userIds, ?int $ownerId = null): void
    {
        $now = now();
        $rows = [];
        foreach (array_unique($userIds) as $uid) {
            $rows[] = [
                'conversation_id' => $conv->id,
                'user_id'         => $uid,
                'role'            => $ownerId === $uid ? Participant::ROLE_OWNER : Participant::ROLE_MEMBER,
                'joined_at'       => $now,
                'created_at'      => $now,
                'updated_at'      => $now,
            ];
        }
        if ($rows) {
            // Upsert prevents duplicate unique constraint hits if user is re-added.
            Participant::query()->upsert(
                $rows,
                ['conversation_id', 'user_id'],
                ['role', 'joined_at', 'left_at', 'updated_at']
            );
            // Re-instate any previously-left participants.
            Participant::query()
                ->where('conversation_id', $conv->id)
                ->whereIn('user_id', $userIds)
                ->update(['left_at' => null]);
        }
    }

    public function removeParticipant(Conversation $conv, int $userId): void
    {
        Participant::query()
            ->where('conversation_id', $conv->id)
            ->where('user_id', $userId)
            ->update(['left_at' => now()]);
    }

    /**
     * Send a message in a conversation (text + optional attachments + reply).
     *
     * @param  UploadedFile[]  $files
     */
    public function sendMessage(
        Conversation $conv,
        ?User $sender,
        ?string $body,
        array $files = [],
        ?int $replyToId = null,
        string $senderType = Message::SENDER_USER,
        ?int $botNodeId = null,
        ?array $meta = null,
        string $type = Message::TYPE_TEXT,
    ): Message {
        if (!$body && empty($files) && !$meta) {
            abort(422, 'Хоосон мессеж илгээх боломжгүй.');
        }

        return DB::transaction(function () use ($conv, $sender, $body, $files, $replyToId, $senderType, $botNodeId, $meta, $type) {
            // If attachments exist and no explicit type chosen, infer.
            $inferredType = $type;
            if ($type === Message::TYPE_TEXT && !empty($files)) {
                $inferredType = $this->isAllImages($files) ? Message::TYPE_IMAGE : Message::TYPE_FILE;
            }

            $message = Message::create([
                'conversation_id' => $conv->id,
                'sender_id'       => $sender?->id,
                'sender_type'     => $senderType,
                'body'            => $body,
                'type'            => $inferredType,
                'bot_node_id'     => $botNodeId,
                'reply_to_id'     => $replyToId,
                'meta'            => $meta,
            ]);

            foreach ($files as $file) {
                $this->storeAttachment($message, $file);
            }

            $conv->update([
                'last_message_id' => $message->id,
                'last_message_at' => $message->created_at,
            ]);

            // Sender's own last_read advances to this message.
            if ($sender) {
                Participant::query()
                    ->where('conversation_id', $conv->id)
                    ->where('user_id', $sender->id)
                    ->update(['last_read_at' => $message->created_at]);
            }

            $participantIds = $this->participantUserIds($conv);

            broadcast(new MessageSent($message, $participantIds))->toOthers();
            broadcast(new ConversationUpdated(
                $conv->id,
                $participantIds,
                [
                    'last_message_at' => $message->created_at?->toIso8601String(),
                    'last_message_preview' => Str::limit((string) $body, 120),
                ]
            ));

            $this->pushToRecipients($conv, $message, $sender, $participantIds);

            return $message;
        });
    }

    public function markRead(Conversation $conv, User $user): void
    {
        $now = Carbon::now();
        $lastMessageId = (int) ($conv->last_message_id ?? 0);

        Participant::query()
            ->where('conversation_id', $conv->id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => $now]);

        if ($lastMessageId > 0) {
            // Bulk-insert read receipts for unread messages from others.
            $unreadIds = Message::query()
                ->where('conversation_id', $conv->id)
                ->where('id', '<=', $lastMessageId)
                ->where(function ($q) use ($user) {
                    $q->where('sender_id', '!=', $user->id)->orWhereNull('sender_id');
                })
                ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
                ->pluck('id');

            if ($unreadIds->isNotEmpty()) {
                $rows = $unreadIds->map(fn ($id) => [
                    'message_id'   => $id,
                    'user_id'      => $user->id,
                    'delivered_at' => $now,
                    'read_at'      => $now,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ])->all();

                MessageRead::query()->upsert(
                    $rows,
                    ['message_id', 'user_id'],
                    ['read_at', 'delivered_at', 'updated_at']
                );
            }
        }

        broadcast(new MessageReadEvent(
            $conv->id,
            $user->id,
            $lastMessageId,
            $now->toIso8601String(),
        ))->toOthers();
    }

    public function unreadCount(Conversation $conv, User $user): int
    {
        $participant = Participant::query()
            ->where('conversation_id', $conv->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$participant) {
            return 0;
        }

        $q = Message::query()
            ->where('conversation_id', $conv->id)
            ->where(function ($q) use ($user) {
                $q->where('sender_id', '!=', $user->id)->orWhereNull('sender_id');
            });

        if ($participant->last_read_at) {
            $q->where('created_at', '>', $participant->last_read_at);
        }

        return $q->count();
    }

    /**
     * @return array<int>
     */
    public function participantUserIds(Conversation $conv): array
    {
        return Participant::query()
            ->where('conversation_id', $conv->id)
            ->whereNull('left_at')
            ->pluck('user_id')
            ->all();
    }

    protected function storeAttachment(Message $message, UploadedFile $file): Attachment
    {
        $disk = 'public';
        $folder = 'chat/' . $message->conversation_id . '/' . now()->format('Y/m');
        $path = $file->store($folder, $disk);

        [$width, $height] = $this->probeImageSize($file);

        return Attachment::create([
            'message_id'    => $message->id,
            'disk'          => $disk,
            'path'          => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type'     => $file->getClientMimeType(),
            'size'          => $file->getSize(),
            'width'         => $width,
            'height'        => $height,
        ]);
    }

    protected function probeImageSize(UploadedFile $file): array
    {
        if (!str_starts_with((string) $file->getClientMimeType(), 'image/')) {
            return [null, null];
        }
        try {
            $info = @getimagesize($file->getRealPath());
            return $info ? [(int) $info[0], (int) $info[1]] : [null, null];
        } catch (\Throwable) {
            return [null, null];
        }
    }

    protected function isAllImages(array $files): bool
    {
        foreach ($files as $f) {
            if (!str_starts_with((string) $f->getClientMimeType(), 'image/')) {
                return false;
            }
        }
        return true;
    }

    /**
     * Push notification to every recipient except the sender.
     * Bot messages still trigger a push to the user (so a handoff "wait" message wakes them up).
     */
    protected function pushToRecipients(Conversation $conv, Message $message, ?User $sender, array $participantIds): void
    {
        try {
            /** @var PushService $push */
            $push = app(PushService::class);

            $convTitle = match ($conv->type) {
                Conversation::TYPE_BOT   => 'HR Туслах',
                Conversation::TYPE_GROUP => $conv->name ?? 'Группын чат',
                default                  => $sender?->name ?? 'Шинэ мессеж',
            };

            $preview = $message->body
                ? \Illuminate\Support\Str::limit($message->body, 140)
                : match ($message->type) {
                    Message::TYPE_IMAGE    => '📷 Зураг',
                    Message::TYPE_FILE     => '📎 Файл',
                    Message::TYPE_BOT_CARD => '🤖 Сонголтын карт',
                    default                => 'Шинэ мессеж',
                };

            $payload = [
                'title' => $convTitle,
                'body'  => ($conv->isGroup() && $sender) ? ($sender->name . ': ' . $preview) : $preview,
                'icon'  => '/img/icon-192.png',
                'badge' => '/img/icon-192.png',
                'tag'   => 'chat-' . $conv->id,
                'data'  => [
                    'conversation_id' => $conv->id,
                    'message_id'      => $message->id,
                    'url'             => '/my/chat',
                ],
            ];

            foreach ($participantIds as $uid) {
                if ($sender && $uid === $sender->id) continue;
                $push->sendToUser($uid, $payload);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('chat push failed', ['err' => $e->getMessage()]);
        }
    }
}
