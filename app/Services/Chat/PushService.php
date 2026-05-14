<?php

namespace App\Services\Chat;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushService
{
    protected ?WebPush $client = null;

    protected function client(): ?WebPush
    {
        if ($this->client) return $this->client;

        $public  = (string) config('webpush.vapid.public_key');
        $private = (string) config('webpush.vapid.private_key');
        $subject = (string) config('webpush.vapid.subject');
        if (!$public || !$private) return null;

        return $this->client = new WebPush([
            'VAPID' => [
                'subject'    => $subject,
                'publicKey'  => $public,
                'privateKey' => $private,
            ],
        ], defaultOptions: [
            'TTL'     => (int) config('webpush.ttl', 86400),
            'urgency' => (string) config('webpush.urgency', 'normal'),
        ]);
    }

    /**
     * Send a push to every active subscription a user has. Silent if VAPID not configured.
     */
    public function sendToUser(User|int $user, array $payload): void
    {
        $client = $this->client();
        if (!$client) return;

        $userId = $user instanceof User ? $user->id : $user;
        $subs = PushSubscription::query()->where('user_id', $userId)->get();
        if ($subs->isEmpty()) return;

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);

        foreach ($subs as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'publicKey'       => $sub->p256dh_key,
                    'authToken'       => $sub->auth_token,
                    'contentEncoding' => 'aesgcm',
                ]);
                $client->queueNotification($subscription, $json);
            } catch (\Throwable $e) {
                Log::warning('webpush queue failed', ['user_id' => $userId, 'sub_id' => $sub->id, 'err' => $e->getMessage()]);
            }
        }

        foreach ($client->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();
            $sub = $subs->firstWhere('endpoint', $endpoint);
            if (!$report->isSuccess()) {
                if ($report->isSubscriptionExpired() && $sub) {
                    $sub->delete();
                } else {
                    Log::info('webpush failed', ['user_id' => $userId, 'reason' => $report->getReason()]);
                }
            } elseif ($sub) {
                $sub->update(['last_used_at' => now()]);
            }
        }
    }
}
