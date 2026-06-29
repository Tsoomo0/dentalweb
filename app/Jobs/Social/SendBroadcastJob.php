<?php

namespace App\Jobs\Social;

use App\Models\Social\SocialBroadcast;
use App\Models\Social\SocialBroadcastRecipient;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialMessage;
use App\Services\Social\MetaGraphService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Broadcast (масс мессеж)-ийг recipient бүрд илгээнэ.
 *
 * ⚠️ Meta дүрэм: сурталчилгааны мессеж зөвхөн 24ц цонх нээлттэй (сүүлд 24ц-д бичсэн)
 * хүмүүст хүрнэ. Цонх хаалттай хүн #10 алдаа өгөн failed болно. tag ХЭРЭГЛЭХГҮЙ.
 */
class SendBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 3600;

    public function __construct(public readonly int $broadcastId) {}

    public function handle(MetaGraphService $meta): void
    {
        $broadcast = SocialBroadcast::find($this->broadcastId);
        if (! $broadcast) {
            return;
        }

        // Дахин ажиллуулсан ч давхар илгээхгүй — зөвхөн pending recipient-ийг авна.
        SocialBroadcastRecipient::where('social_broadcast_id', $broadcast->id)
            ->where('status', SocialBroadcastRecipient::STATUS_PENDING)
            ->with('contact.account')
            ->chunkById(100, function ($recipients) use ($meta, $broadcast) {
                foreach ($recipients as $recipient) {
                    $ok = $this->sendOne($meta, $broadcast, $recipient);
                    // Атомик increment — явц always зөв, resume хийсэн ч давхцахгүй.
                    $broadcast->increment($ok ? 'sent_count' : 'failed_count');
                    usleep(120000); // ~8/сек — Meta rate limit-ээс хол
                }
            });

        $broadcast->update([
            'status' => SocialBroadcast::STATUS_DONE,
            'finished_at' => now(),
        ]);
    }

    /** Job бүхэлдээ унавал broadcast-г "алдаа" төлөвт оруулна (мөнхөд "илгээж байна" болж хоцрохгүй). */
    public function failed(\Throwable $e): void
    {
        SocialBroadcast::where('id', $this->broadcastId)
            ->where('status', SocialBroadcast::STATUS_SENDING)
            ->update(['status' => SocialBroadcast::STATUS_FAILED, 'finished_at' => now()]);
    }

    /** Нэг recipient рүү илгээж, recipient статусыг шинэчилнэ. true=амжилттай. */
    private function sendOne(MetaGraphService $meta, SocialBroadcast $broadcast, SocialBroadcastRecipient $recipient): bool
    {
        $contact = $recipient->contact;
        $account = $contact?->account;

        if (! $contact || ! $account) {
            $recipient->update(['status' => SocialBroadcastRecipient::STATUS_FAILED, 'error' => 'Контакт/хаяг олдсонгүй']);

            return false;
        }

        try {
            // Зураг (хэрэв байвал)
            if (! empty($broadcast->image_url)) {
                $meta->sendImage($account, $contact->external_id, $broadcast->image_url);
            }

            $text = (string) $broadcast->text;
            $hasButton = ! empty($broadcast->button_label) && ! empty($broadcast->button_url);

            if ($hasButton && $contact->channel === 'messenger') {
                // Messenger — button template (CTA web_url)
                $result = $meta->sendButtonTemplate($account, $contact->external_id, $text !== '' ? $text : '⠀', [
                    ['type' => 'web_url', 'title' => mb_substr($broadcast->button_label, 0, 20), 'url' => $broadcast->button_url],
                ]);
            } else {
                // IG (button template дэмжихгүй) эсвэл товчгүй — текст + (товчтой бол) холбоосыг мөрөнд
                if ($hasButton) {
                    $text = trim($text."\n\n{$broadcast->button_label}: {$broadcast->button_url}");
                }
                $result = $meta->sendText($account, $contact->external_id, $text !== '' ? $text : '⠀');
            }

            if (! ($result['ok'] ?? false)) {
                $recipient->update(['status' => SocialBroadcastRecipient::STATUS_FAILED, 'error' => mb_substr((string) ($result['error'] ?? 'тодорхойгүй'), 0, 500)]);

                return false;
            }

            $recipient->update(['status' => SocialBroadcastRecipient::STATUS_SENT, 'sent_at' => now(), 'error' => null]);
            $this->record($contact->id, $broadcast, $result['mid'] ?? null);

            return true;
        } catch (\Throwable $e) {
            Log::warning('Broadcast send failed', ['recipient' => $recipient->id, 'error' => $e->getMessage()]);
            $recipient->update(['status' => SocialBroadcastRecipient::STATUS_FAILED, 'error' => mb_substr($e->getMessage(), 0, 500)]);

            return false;
        }
    }

    /** Илгээсэн мессежийг харилцааны түүхэд (inbox) бот мессеж болгож тэмдэглэнэ. */
    private function record(int $contactId, SocialBroadcast $broadcast, ?string $mid): void
    {
        $conversation = SocialConversation::where('social_contact_id', $contactId)->first();
        if (! $conversation) {
            return;
        }

        $preview = mb_substr('📢 '.($broadcast->text ?: $broadcast->name), 0, 1000);
        SocialMessage::create([
            'social_conversation_id' => $conversation->id,
            'direction' => SocialMessage::DIR_OUT,
            'sender' => SocialMessage::SENDER_BOT,
            'type' => ! empty($broadcast->image_url) ? 'image' : 'text',
            'text' => $broadcast->text,
            'attachments' => ! empty($broadcast->image_url) ? [['type' => 'image', 'url' => $broadcast->image_url]] : null,
            'external_mid' => $mid,
            'delivered_at' => now(),
        ]);

        $conversation->update(['last_message_text' => $preview, 'last_message_at' => now()]);
    }
}
