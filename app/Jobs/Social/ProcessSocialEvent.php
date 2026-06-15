<?php

namespace App\Jobs\Social;

use App\Events\Social\SocialMessageReceived;
use App\Models\Social\SocialAccount;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialMessage;
use App\Services\Social\MetaGraphService;
use App\Services\Social\SocialCommentHandler;
use App\Services\Social\SocialFlowRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Meta webhook payload-ийг боловсруулна: DM мессеж → contact/conversation/message.
 * Facebook Page (object=page) болон Instagram (object=instagram) хоёуланг дэмжинэ.
 */
class ProcessSocialEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 20;

    public function __construct(public readonly array $payload) {}

    public function handle(MetaGraphService $meta, SocialFlowRunner $runner, SocialCommentHandler $comments): void
    {
        $object = $this->payload['object'] ?? null;
        $channel = $object === 'instagram' ? 'instagram' : 'messenger';

        foreach ($this->payload['entry'] ?? [] as $entry) {
            $accountRef = (string) ($entry['id'] ?? '');

            $account = $channel === 'instagram'
                ? SocialAccount::where('ig_id', $accountRef)->first()
                : SocialAccount::where('page_id', $accountRef)->first();

            if (! $account) {
                Log::warning('Social event: account not found', ['ref' => $accountRef, 'channel' => $channel]);

                continue;
            }

            // DM мессеж
            foreach ($entry['messaging'] ?? [] as $event) {
                try {
                    $this->handleMessaging($meta, $runner, $account, $channel, $event);
                } catch (\Throwable $e) {
                    Log::error('Social event handle error', ['error' => $e->getMessage(), 'event' => $event]);
                }
            }

            // Коммент (feed / comments)
            foreach ($entry['changes'] ?? [] as $change) {
                try {
                    $this->handleChange($comments, $account, $channel, $change);
                } catch (\Throwable $e) {
                    Log::error('Social comment handle error', ['error' => $e->getMessage(), 'change' => $change]);
                }
            }
        }
    }

    /** Хүргэгдсэн (delivery) / уншсан (read) event — аналитик шинэчилнэ. */
    private function handleReceipt(SocialAccount $account, string $channel, array $event): void
    {
        $userId = (string) ($event['sender']['id'] ?? '');
        if ($userId === '') {
            return;
        }

        $contact = SocialContact::where('social_account_id', $account->id)
            ->where('channel', $channel)->where('external_id', $userId)->first();
        if (! $contact) {
            return;
        }

        $conversation = SocialConversation::where('social_contact_id', $contact->id)->first();
        if (! $conversation) {
            return;
        }

        if (! empty($event['delivery']['mids'])) {
            SocialMessage::where('social_conversation_id', $conversation->id)
                ->whereIn('external_mid', $event['delivery']['mids'])
                ->whereNull('delivered_at')
                ->update(['delivered_at' => now()]);
        }

        if (isset($event['read']['watermark'])) {
            $watermark = Carbon::createFromTimestampMs((int) $event['read']['watermark']);
            SocialMessage::where('social_conversation_id', $conversation->id)
                ->where('direction', SocialMessage::DIR_OUT)
                ->whereNull('read_at')
                ->where('created_at', '<=', $watermark)
                ->update(['read_at' => now()]);
        }
    }

    /**
     * Echo мессеж — page-аас гарсан мессежийн хуулбар.
     *  • Манай ботын/апп-ийн өөрийн мессеж бол алгасна.
     *  • Meta Page Inbox-оос (эсвэл өөр апп) ХҮН бичсэн бол ботыг зогсоож (open),
     *    тэр мессежийг манай inbox-д операторын хариу болгож харуулна.
     */
    private function handleEcho(SocialAccount $account, string $channel, array $event): void
    {
        $message = $event['message'] ?? [];
        $appId = (string) ($message['app_id'] ?? '');
        $ourAppId = (string) config('services.meta.app_id');

        // Манай апп өөрөө илгээсэн мессеж — алгасна (давхар бичихгүй).
        if ($appId !== '' && $appId === $ourAppId) {
            return;
        }

        // Echo дээр recipient = хэрэглэгч (sender = page).
        $userId = (string) ($event['recipient']['id'] ?? '');
        if ($userId === '') {
            return;
        }

        $contact = SocialContact::where('social_account_id', $account->id)
            ->where('channel', $channel)->where('external_id', $userId)->first();
        if (! $contact) {
            return;
        }

        $conversation = SocialConversation::where('social_contact_id', $contact->id)->first();
        if (! $conversation) {
            return;
        }

        // Давхардсан echo-г алгасна.
        $mid = $message['mid'] ?? null;
        if ($mid && SocialMessage::where('external_mid', $mid)->exists()) {
            return;
        }

        // Хүн Meta inbox-оос хариулсан тул ботыг зогсооно.
        if ($conversation->status === SocialConversation::STATUS_BOT) {
            $conversation->update(['status' => SocialConversation::STATUS_OPEN, 'awaiting_node_id' => null]);
        }

        $text = $message['text'] ?? null;
        $stored = SocialMessage::create([
            'social_conversation_id' => $conversation->id,
            'direction' => SocialMessage::DIR_OUT,
            'sender' => SocialMessage::SENDER_AGENT,
            'type' => $text !== null ? 'text' : 'attachment',
            'text' => $text,
            'attachments' => $message['attachments'] ?? null,
            'external_mid' => $mid,
            'delivered_at' => now(),
        ]);

        $convUpdate = ['last_message_at' => now()];
        if ($text !== null && trim($text) !== '') {
            $convUpdate['last_message_text'] = mb_substr($text, 0, 1000);
        }
        $conversation->update($convUpdate);

        try {
            broadcast(new SocialMessageReceived($stored));
        } catch (\Throwable $e) {
            Log::warning('Social broadcast failed', ['error' => $e->getMessage()]);
        }
    }

    /** Постын коммент event-ийг боловсруулна (FB feed / IG comments). */
    private function handleChange(SocialCommentHandler $comments, SocialAccount $account, string $channel, array $change): void
    {
        $field = $change['field'] ?? '';
        $value = $change['value'] ?? [];

        if ($channel === 'instagram' && $field === 'comments') {
            $commentId = (string) ($value['id'] ?? '');
            $postId = $value['media']['id'] ?? null;
            $text = $value['text'] ?? '';
            $fromId = (string) ($value['from']['id'] ?? '');
            $selfId = $account->ig_id;
        } elseif ($channel === 'messenger' && $field === 'feed') {
            // Зөвхөн шинэ коммент.
            if (($value['item'] ?? '') !== 'comment' || ($value['verb'] ?? '') !== 'add') {
                return;
            }
            $commentId = (string) ($value['comment_id'] ?? '');
            $postId = $value['post_id'] ?? null;
            $text = $value['message'] ?? '';
            $fromId = (string) ($value['from']['id'] ?? '');
            $selfId = $account->page_id;
        } else {
            return;
        }

        // Өөрийн (хуудасны) коммент/хариуг алгасч давталтаас сэргийлнэ.
        if ($commentId === '' || ($selfId !== null && $fromId === (string) $selfId)) {
            return;
        }

        $comments->handle($account, $commentId, $postId, (string) $text, $fromId, $channel);
    }

    private function handleMessaging(MetaGraphService $meta, SocialFlowRunner $runner, SocialAccount $account, string $channel, array $event): void
    {
        // Хүргэгдсэн / уншсан баримт (аналитик)
        if (isset($event['delivery']) || isset($event['read'])) {
            $this->handleReceipt($account, $channel, $event);

            return;
        }

        $message = $event['message'] ?? null;
        $postback = $event['postback'] ?? null;

        // Echo — өөрийн ботын мессеж бол алгасна; Meta Page Inbox-оос хүн бичсэн бол ботыг зогсооно.
        if ($message && ($message['is_echo'] ?? false)) {
            $this->handleEcho($account, $channel, $event);

            return;
        }

        $senderId = (string) ($event['sender']['id'] ?? '');
        if ($senderId === '') {
            return;
        }

        // Товч дарсан эсэх (quick reply эсвэл postback) + текст
        if ($postback) {
            $payload = $postback['payload'] ?? null;
            $text = $postback['title'] ?? null;
            $attachments = null;
        } elseif ($message) {
            $payload = $message['quick_reply']['payload'] ?? null;
            $text = $message['text'] ?? null;
            $attachments = $message['attachments'] ?? null;
        } else {
            return; // delivery/read/seen — алгасна
        }

        // Юу ч агуулаагүй event-ийг алгасна.
        if ($text === null && empty($attachments) && $payload === null) {
            return;
        }

        // ── Contact ──────────────────────────────────────────────────────────
        $contact = SocialContact::firstOrNew([
            'social_account_id' => $account->id,
            'channel' => $channel,
            'external_id' => $senderId,
        ]);

        // Шинэ contact, эсвэл нэр нь хоосон хуучин contact бол профайлыг (дахин) татна.
        if (! $contact->exists || empty($contact->name)) {
            $profile = $meta->getUserProfile($account, $senderId, $channel);
            if (! empty($profile['name']) || ! empty($profile['username'])) {
                $contact->name = $profile['name'] ?? $contact->name;
                $contact->username = $profile['username'] ?? $contact->username;
                $contact->avatar = $profile['avatar'] ?? $contact->avatar;
            }
        }

        $contact->last_interacted_at = now();
        $contact->save();

        // ── Conversation ───────────────────────────────────────────────────────
        $conversation = SocialConversation::firstOrNew(['social_contact_id' => $contact->id]);
        $isNew = ! $conversation->exists;

        if ($isNew) {
            $conversation->social_account_id = $account->id;
            $conversation->channel = $channel;
            $conversation->status = SocialConversation::STATUS_BOT; // эхэндээ bot хариулна
        }

        $conversation->last_message_text = $text !== null ? mb_substr($text, 0, 1000) : '[хавсралт]';
        $conversation->last_message_at = now();
        $conversation->window_expires_at = now()->addHours(24);
        $conversation->unread_count = ($conversation->unread_count ?? 0) + 1;
        $conversation->save();

        // ── Message ──────────────────────────────────────────────────────────
        $stored = SocialMessage::create([
            'social_conversation_id' => $conversation->id,
            'direction' => SocialMessage::DIR_IN,
            'sender' => SocialMessage::SENDER_CONTACT,
            'type' => $text !== null ? 'text' : 'attachment',
            'text' => $text,
            'attachments' => $attachments,
            'external_mid' => is_array($message) ? ($message['mid'] ?? null) : null,
            'delivered_at' => isset($event['timestamp'])
                ? Carbon::createFromTimestampMs((int) $event['timestamp'])
                : now(),
        ]);

        try {
            broadcast(new SocialMessageReceived($stored));
        } catch (\Throwable $e) {
            Log::warning('Social broadcast failed', ['error' => $e->getMessage()]);
        }

        // ── Оператор 1 цаг идэвхгүй бол автоматаар бот руу буцаана (оператор мартсан ч) ──
        if ($conversation->status === SocialConversation::STATUS_OPEN) {
            $lastAgentAt = SocialMessage::where('social_conversation_id', $conversation->id)
                ->where('sender', SocialMessage::SENDER_AGENT)
                ->max('created_at');
            if ($lastAgentAt && Carbon::parse($lastAgentAt)->lt(now()->subHour())) {
                $conversation->update(['status' => SocialConversation::STATUS_BOT, 'awaiting_node_id' => null]);
            }
        }

        // ── Flow engine — зөвхөн bot горимд автоматаар хариулна ──────────────────
        if ($conversation->status === SocialConversation::STATUS_BOT) {
            $runner->handleIncoming($account, $conversation, $contact, $text, $payload, $isNew);
        }
    }
}
