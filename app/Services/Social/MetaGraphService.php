<?php

namespace App\Services\Social;

use App\Models\Social\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Meta Graph API үйлчилгээ — Facebook Login (OAuth) + Page/Instagram messaging.
 *
 * Холболтын урсгал:
 *   1. buildLoginUrl()  — админыг Facebook login руу чиглүүлнэ
 *   2. exchangeCodeForToken() — буцаж ирсэн code-г хэрэглэгчийн токен болгоно
 *   3. longLivedUserToken()   — урт хугацааны токен болгоно
 *   4. fetchPages()           — хэрэглэгчийн Page-үүд + холбосон IG-г татна
 *   5. subscribePageWebhook() — Page-ийг webhook-д бүртгэнэ
 */
class MetaGraphService
{
    private string $appId;

    private string $appSecret;

    private string $version;

    private string $graphUrl;

    public function __construct()
    {
        $this->appId = (string) config('services.meta.app_id');
        $this->appSecret = (string) config('services.meta.app_secret');
        $this->version = (string) config('services.meta.api_version', 'v21.0');
        $this->graphUrl = rtrim((string) config('services.meta.graph_url', 'https://graph.facebook.com'), '/');
    }

    /** Graph API-д хэрэгтэй зөвшөөрлүүд (Page Messenger + Instagram DM/коммент). */
    public const SCOPES = [
        'pages_show_list',
        'pages_manage_metadata',
        'pages_manage_engagement', // комментод public хариу бичих, like/reply удирдах
        'pages_messaging',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_manage_messages',
        'instagram_manage_comments',
        'business_management',
    ];

    private function base(): string
    {
        return "{$this->graphUrl}/{$this->version}";
    }

    /**
     * Энэ instance-ийн дараагийн send дуудлагуудад хэрэглэх messaging tag.
     * null = энгийн RESPONSE (24ц цонхны дотор). 'HUMAN_AGENT' = операторын хариу
     * 24ц өнгөрсөн ч 7 хоног хүртэл (Meta-гийн Human Agent feature батлагдсан байх ёстой).
     */
    private ?string $messagingTag = null;

    public function useMessagingTag(?string $tag): static
    {
        $this->messagingTag = $tag;

        return $this;
    }

    /**
     * Send payload-д орох messaging_type (+ шаардвал tag).
     *
     * @return array<string, string>
     */
    private function envelope(): array
    {
        return $this->messagingTag
            ? ['messaging_type' => 'MESSAGE_TAG', 'tag' => $this->messagingTag]
            : ['messaging_type' => 'RESPONSE'];
    }

    /** Meta-гийн gender утгыг 'male'/'female'/null болгож нормчилно. */
    private function normalizeGender(?string $g): ?string
    {
        $g = mb_strtolower(trim((string) $g));

        return match ($g) {
            'male', 'm' => 'male',
            'female', 'f' => 'female',
            default => null,
        };
    }

    // ─── 1. Facebook login URL ────────────────────────────────────────────────

    public function buildLoginUrl(string $redirectUri, string $state): string
    {
        $params = http_build_query([
            'client_id' => $this->appId,
            'redirect_uri' => $redirectUri,
            'state' => $state,
            'scope' => implode(',', self::SCOPES),
            'response_type' => 'code',
            // Өмнө зөвшөөрсөн апп-д ШИНЭ зөвшөөрлийг (pages_manage_engagement) дахин асуухыг албадна.
            'auth_type' => 'rerequest',
        ]);

        // Login dialog нь www.facebook.com дээр (graph биш)
        return "https://www.facebook.com/{$this->version}/dialog/oauth?{$params}";
    }

    // ─── 2. code → short-lived user token ─────────────────────────────────────

    public function exchangeCodeForToken(string $code, string $redirectUri): string
    {
        $response = Http::timeout(15)->get("{$this->base()}/oauth/access_token", [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code,
        ]);

        if (! $response->successful() || empty($response->json('access_token'))) {
            Log::error('Meta code exchange failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('Facebook нэвтрэлт амжилтгүй: '.$response->body());
        }

        return (string) $response->json('access_token');
    }

    // ─── 3. short-lived → long-lived user token (≈60 хоног) ───────────────────

    public function longLivedUserToken(string $shortToken): string
    {
        $response = Http::timeout(15)->get("{$this->base()}/oauth/access_token", [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'fb_exchange_token' => $shortToken,
        ]);

        if (! $response->successful() || empty($response->json('access_token'))) {
            Log::warning('Meta long-lived token failed, falling back', ['body' => $response->body()]);

            return $shortToken; // богино токеноор үргэлжилнэ
        }

        return (string) $response->json('access_token');
    }

    // ─── 4. Хэрэглэгчийн Page-үүд + холбосон Instagram ────────────────────────

    /**
     * @return array<int, array{page_id:string, page_name:string, page_access_token:string,
     *                          ig_id:?string, ig_username:?string, avatar:?string}>
     */
    public function fetchPages(string $userToken): array
    {
        $response = Http::timeout(20)->get("{$this->base()}/me/accounts", [
            'access_token' => $userToken,
            'fields' => 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
            'limit' => 100,
        ]);

        if (! $response->successful()) {
            Log::error('Meta fetchPages failed', ['body' => $response->body()]);
            throw new \RuntimeException('Facebook Page-үүдийг татаж чадсангүй: '.$response->body());
        }

        return collect($response->json('data', []))->map(fn ($p) => [
            'page_id' => (string) ($p['id'] ?? ''),
            'page_name' => (string) ($p['name'] ?? ''),
            'page_access_token' => (string) ($p['access_token'] ?? ''),
            'ig_id' => isset($p['instagram_business_account']['id']) ? (string) $p['instagram_business_account']['id'] : null,
            'ig_username' => $p['instagram_business_account']['username'] ?? null,
            'avatar' => $p['instagram_business_account']['profile_picture_url'] ?? null,
        ])->filter(fn ($p) => $p['page_id'] !== '')->values()->all();
    }

    // ─── 5. Page-ийг webhook-д бүртгэх ───────────────────────────────────────

    public function subscribePageWebhook(SocialAccount $account): bool
    {
        try {
            $response = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/subscribed_apps", [
                'subscribed_fields' => 'messages,message_echoes,messaging_postbacks,message_reactions,message_reads,message_deliveries,feed',
                'access_token' => $account->page_access_token,
            ]);

            $ok = $response->successful() && ($response->json('success') === true);

            if (! $ok) {
                Log::warning('Meta webhook subscribe failed', ['page' => $account->page_id, 'body' => $response->body()]);
            }

            return $ok;
        } catch (\Throwable $e) {
            Log::error('Meta webhook subscribe exception', ['page' => $account->page_id, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Чат эхлэх цэг тохируулна:
     *   • Facebook Messenger — "Get Started" товч + угтах текст + Ice Breakers + Persistent Menu
     *   • Instagram — Ice Breakers + Persistent Menu (IG-д "Get Started" товч байдаггүй, энэ нь дүйцэх)
     * Хэрэглэгч дарахад GET_STARTED postback ирж welcome flow эхэлнэ.
     *
     * @param  array<int, array{type:string,title:string,payload?:string,url?:string}>  $menuItems
     *         Байнгын цэс/ice breaker-т нэмэх үндсэн навигаци (Эхлэл автоматаар эхэнд орно).
     */
    public function setMessengerProfile(SocialAccount $account, ?string $greeting = null, array $menuItems = []): bool
    {
        if (empty($account->page_id) || empty($account->page_access_token)) {
            return false;
        }

        // Үндсэн навигаци — "🚀 Эхлэл" эхэнд, дараа нь дамжуулсан цэснүүд.
        $menuActions = [['type' => 'postback', 'title' => '🚀 Эхлэл', 'payload' => 'GET_STARTED']];
        foreach ($menuItems as $item) {
            if (empty($item['title'])) {
                continue;
            }
            // Persistent menu нь зөвхөн postback / web_url дэмжинэ (phone_number-ийг алгасна).
            if (($item['type'] ?? '') === 'phone_number') {
                continue;
            }
            $cta = ['type' => $item['type'] ?? 'postback', 'title' => mb_substr($item['title'], 0, 30)];
            if (($item['type'] ?? 'postback') === 'web_url') {
                $cta['url'] = $item['url'] ?? '';
            } else {
                $cta['type'] = 'postback';
                $cta['payload'] = $item['payload'] ?? 'GET_STARTED';
            }
            $menuActions[] = $cta;
        }
        $menuActions = array_slice($menuActions, 0, 5); // Meta дээд тал нь 5 (эхний түвшин 3 эгнээ хүртэл харагдана)

        // Эхлэх асуултууд (ice breakers) — postback цэснүүдээс 4 хүртэл (web_url, phone оруулахгүй).
        $iceActions = [];
        foreach ($menuActions as $a) {
            if (($a['type'] ?? '') === 'postback') {
                $iceActions[] = ['question' => $a['title'], 'payload' => $a['payload']];
            }
        }
        $iceBreakers = [['locale' => 'default', 'call_to_actions' => array_slice($iceActions, 0, 4)]];

        // Байнга харагдах цэс — хаанаас ч үндсэн хэсгүүд рүү шууд үсэрнэ.
        $persistentMenu = [[
            'locale' => 'default',
            'composer_input_disabled' => false,
            'call_to_actions' => $menuActions,
        ]];

        $ok = true;

        // 1) Facebook Messenger профайл (get_started + greeting + ice breakers + persistent menu)
        try {
            $body = [
                'get_started' => ['payload' => 'GET_STARTED'],
                'ice_breakers' => $iceBreakers,
                'persistent_menu' => $persistentMenu,
                'access_token' => $account->page_access_token,
            ];
            if ($greeting !== null && trim($greeting) !== '') {
                $body['greeting'] = [['locale' => 'default', 'text' => mb_substr($greeting, 0, 160)]];
            }

            $response = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/messenger_profile", $body);
            if (! $response->successful()) {
                Log::warning('Meta messenger_profile failed', ['page' => $account->page_id, 'body' => $response->body()]);
                $ok = false;
            }
        } catch (\Throwable $e) {
            Log::error('Meta messenger_profile exception', ['page' => $account->page_id, 'error' => $e->getMessage()]);
            $ok = false;
        }

        // 2) Instagram профайл (зөвхөн IG холбогдсон бол) — ice breakers (platform=instagram)
        if (! empty($account->ig_id)) {
            try {
                $igResponse = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/messenger_profile", [
                    'platform' => 'instagram',
                    'ice_breakers' => $iceBreakers,
                    'persistent_menu' => $persistentMenu,
                    'access_token' => $account->page_access_token,
                ]);
                if (! $igResponse->successful()) {
                    Log::warning('Meta IG ice_breakers failed', ['ig' => $account->ig_id, 'body' => $igResponse->body()]);
                }
            } catch (\Throwable $e) {
                Log::error('Meta IG ice_breakers exception', ['ig' => $account->ig_id, 'error' => $e->getMessage()]);
            }
        }

        return $ok;
    }

    // ─── Коммент (public reply + хувийн DM) ──────────────────────────────────

    /** Комментод нийтээр хариулах (FB + IG: /{comment-id}/replies). */
    public function replyToComment(SocialAccount $account, string $commentId, string $text): bool
    {
        try {
            $response = Http::timeout(15)->post("{$this->base()}/{$commentId}/replies", [
                'message' => $text,
                'access_token' => $account->page_access_token,
            ]);

            if (! $response->successful()) {
                Log::warning('Meta replyToComment failed', ['comment' => $commentId, 'body' => $response->body()]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Meta replyToComment exception', ['comment' => $commentId, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Комментод хувийн DM (private reply) илгээх — recipient.comment_id.
     * Нэг комментод нэг л удаа зөвшөөрнө.
     */
    public function sendPrivateReply(SocialAccount $account, string $commentId, string $text): bool
    {
        try {
            $response = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/messages", [
                'recipient' => ['comment_id' => $commentId],
                'message' => ['text' => $text],
                'access_token' => $account->page_access_token,
            ]);

            if (! $response->successful()) {
                Log::warning('Meta sendPrivateReply failed', ['comment' => $commentId, 'body' => $response->body()]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Meta sendPrivateReply exception', ['comment' => $commentId, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Комментод дурын message (текст / button template / generic) private reply-аар илгээх.
     * Хариунд messaging PSID (`recipient_id`) ирдэг — flow үргэлжлүүлэхэд ашиглана.
     *
     * @param  array<string, mixed>  $message
     * @return array{ok:bool, recipient_id:?string, mid:?string, error:?string}
     */
    public function sendPrivateReplyMessage(SocialAccount $account, string $commentId, array $message): array
    {
        try {
            $response = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/messages", [
                'recipient' => ['comment_id' => $commentId],
                'message' => $message,
                'access_token' => $account->page_access_token,
            ]);

            if (! $response->successful()) {
                Log::warning('Meta sendPrivateReplyMessage failed', ['comment' => $commentId, 'body' => $response->body()]);

                return ['ok' => false, 'recipient_id' => null, 'mid' => null, 'error' => $response->json('error.message') ?? $response->body()];
            }

            return ['ok' => true, 'recipient_id' => $response->json('recipient_id'), 'mid' => $response->json('message_id'), 'error' => null];
        } catch (\Throwable $e) {
            Log::error('Meta sendPrivateReplyMessage exception', ['comment' => $commentId, 'error' => $e->getMessage()]);

            return ['ok' => false, 'recipient_id' => null, 'mid' => null, 'error' => $e->getMessage()];
        }
    }

    // ─── Webhook signature шалгах (X-Hub-Signature-256) ──────────────────────

    public function verifySignature(string $rawBody, ?string $signatureHeader): bool
    {
        if (empty($signatureHeader) || ! str_starts_with($signatureHeader, 'sha256=')) {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $rawBody, $this->appSecret);

        return hash_equals($expected, $signatureHeader);
    }

    // ─── Постууд (коммент дүрэмд сонгох) ─────────────────────────────────────

    /**
     * Хуудасны сүүлийн постууд (Instagram media + Facebook posts).
     *
     * @return array<int, array{id:string, channel:string, text:string, image:?string, permalink:?string, time:?string}>
     */
    public function fetchPosts(SocialAccount $account): array
    {
        $posts = [];

        // Instagram media
        if ($account->ig_id) {
            try {
                $r = Http::timeout(20)->get("{$this->base()}/{$account->ig_id}/media", [
                    'fields' => 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
                    'limit' => 24,
                    'access_token' => $account->page_access_token,
                ]);
                if ($r->successful()) {
                    foreach ($r->json('data', []) as $m) {
                        $posts[] = [
                            'id' => (string) ($m['id'] ?? ''),
                            'channel' => 'instagram',
                            'text' => $m['caption'] ?? '',
                            'image' => $m['thumbnail_url'] ?? $m['media_url'] ?? null,
                            'permalink' => $m['permalink'] ?? null,
                            'time' => $m['timestamp'] ?? null,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Meta fetchPosts IG failed', ['error' => $e->getMessage()]);
            }
        }

        // Facebook posts
        try {
            $r = Http::timeout(20)->get("{$this->base()}/{$account->page_id}/published_posts", [
                'fields' => 'id,message,full_picture,permalink_url,created_time',
                'limit' => 24,
                'access_token' => $account->page_access_token,
            ]);
            if ($r->successful()) {
                foreach ($r->json('data', []) as $p) {
                    $posts[] = [
                        'id' => (string) ($p['id'] ?? ''),
                        'channel' => 'facebook',
                        'text' => $p['message'] ?? '',
                        'image' => $p['full_picture'] ?? null,
                        'permalink' => $p['permalink_url'] ?? null,
                        'time' => $p['created_time'] ?? null,
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Meta fetchPosts FB failed', ['error' => $e->getMessage()]);
        }

        return $posts;
    }

    // ─── Контактын профайл (нэр / зураг) ─────────────────────────────────────

    /**
     * @return array{name:?string, username:?string, avatar:?string, gender:?string}
     */
    public function getUserProfile(SocialAccount $account, string $userId, string $channel): array
    {
        $empty = ['name' => null, 'username' => null, 'avatar' => null, 'gender' => null];

        // 1) Шууд профайл (Advanced Access / App Review байвал зураг хүртэл ирнэ).
        // gender нь ихэнхдээ ирдэггүй (Meta PSID-ийн хүйс өгдөггүй) — байвал л авна.
        try {
            $fields = $channel === 'instagram' ? 'name,username,profile_pic' : 'name,profile_pic,gender';
            $response = Http::timeout(10)->get("{$this->base()}/{$userId}", [
                'fields' => $fields,
                'access_token' => $account->page_access_token,
            ]);

            if ($response->successful() && ($response->json('name') || $response->json('username'))) {
                return [
                    'name' => $response->json('name'),
                    'username' => $response->json('username'),
                    'avatar' => $response->json('profile_pic'),
                    'gender' => $this->normalizeGender($response->json('gender')),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('Meta getUserProfile (direct) failed', ['user' => $userId, 'error' => $e->getMessage()]);
        }

        // 2) Conversations endpoint — Standard Access дээр ч жинхэнэ нэр/username буцаадаг.
        try {
            $platform = $channel === 'instagram' ? 'instagram' : 'messenger';
            $response = Http::timeout(12)->get("{$this->base()}/{$account->page_id}/conversations", [
                'platform' => $platform,
                'user_id' => $userId,
                'fields' => 'participants',
                'access_token' => $account->page_access_token,
            ]);

            if ($response->successful()) {
                $participants = $response->json('data.0.participants.data') ?? [];
                foreach ($participants as $p) {
                    if ((string) ($p['id'] ?? '') === (string) $userId) {
                        return [
                            'name' => $p['name'] ?? null,
                            'username' => $p['username'] ?? null,
                            'avatar' => null,
                            'gender' => null,
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Meta getUserProfile (conversations) failed', ['user' => $userId, 'error' => $e->getMessage()]);
        }

        return $empty;
    }

    // ─── Мессеж илгээх (Phase 1-д ашиглана) ──────────────────────────────────

    /**
     * Page/Instagram хэрэглэгч рүү текст илгээх.
     * Messenger болон Instagram messaging хоёулаа Page token-оор /{page-id}/messages эндпойнтыг ашигладаг.
     *
     * @return array{ok:bool, mid:?string, error:?string}
     */
    public function sendText(SocialAccount $account, string $recipientId, string $text): array
    {
        try {
            $response = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/messages", [
                'recipient' => ['id' => $recipientId],
                'message' => ['text' => $text],
                ...$this->envelope(),
                'access_token' => $account->page_access_token,
            ]);

            if (! $response->successful()) {
                Log::warning('Meta sendText failed', ['recipient' => $recipientId, 'body' => $response->body()]);

                return ['ok' => false, 'mid' => null, 'error' => $response->json('error.message') ?? $response->body()];
            }

            return ['ok' => true, 'mid' => $response->json('message_id'), 'error' => null];
        } catch (\Throwable $e) {
            Log::error('Meta sendText exception', ['recipient' => $recipientId, 'error' => $e->getMessage()]);

            return ['ok' => false, 'mid' => null, 'error' => $e->getMessage()];
        }
    }

    /** Зураг илгээх. */
    public function sendImage(SocialAccount $account, string $recipientId, string $imageUrl): array
    {
        return $this->sendAttachment($account, $recipientId, 'image', $imageUrl);
    }

    /**
     * Хавсралт илгээх (image / audio / video / file).
     *
     * Дотоод файл (/storage/...) бол Meta рүү ШУУД upload хийнэ (multipart) —
     * ингэснээр public URL / тунель шаардахгүй, localhost дээр ч ажиллана.
     * Гадаад URL бол хэвээр URL-аар илгээнэ.
     *
     * @return array{ok:bool, mid:?string, error:?string}
     */
    public function sendAttachment(SocialAccount $account, string $recipientId, string $type, string $url): array
    {
        // Дотоод файлыг уншиж multipart-аар upload хийхийг оролдоно.
        $contents = null;
        $filename = null;
        if (str_starts_with($url, '/storage/')) {
            $relative = ltrim(substr($url, strlen('/storage/')), '/');
            if (Storage::disk('public')->exists($relative)) {
                $contents = Storage::disk('public')->get($relative);
                $filename = basename($relative);
            }
        }

        try {
            if ($contents !== null) {
                // Multipart upload — recipient/message нь JSON мөр болж явна.
                $response = Http::timeout(60)
                    ->attach('filedata', $contents, $filename)
                    ->post("{$this->base()}/{$account->page_id}/messages", [
                        'recipient' => json_encode(['id' => $recipientId]),
                        ...$this->envelope(),
                        'message' => json_encode(['attachment' => ['type' => $type, 'payload' => ['is_reusable' => true]]]),
                        'access_token' => $account->page_access_token,
                    ]);
            } else {
                if (str_starts_with($url, '/')) {
                    $url = $this->mediaBase().$url;
                }
                $response = Http::timeout(30)->post("{$this->base()}/{$account->page_id}/messages", [
                    'recipient' => ['id' => $recipientId],
                    ...$this->envelope(),
                    'message' => ['attachment' => ['type' => $type, 'payload' => ['url' => $url, 'is_reusable' => true]]],
                    'access_token' => $account->page_access_token,
                ]);
            }

            if (! $response->successful()) {
                Log::warning('Meta sendAttachment failed', ['type' => $type, 'recipient' => $recipientId, 'body' => $response->body()]);

                return ['ok' => false, 'mid' => null, 'error' => $response->json('error.message') ?? $response->body()];
            }

            return ['ok' => true, 'mid' => $response->json('message_id'), 'error' => null];
        } catch (\Throwable $e) {
            Log::error('Meta sendAttachment exception', ['type' => $type, 'error' => $e->getMessage()]);

            return ['ok' => false, 'mid' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Button template илгээх — текст + дээд тал нь 3 босоо товч (postback / web_url / phone_number).
     * Builder дээрх "зураг + текст + товч" картын товчны хэсгийг яг ингэж дүрсэлнэ.
     *
     * @param  array<int, array<string, mixed>>  $buttons
     * @param  array<int, array{title:string,payload:string}>  $quickReplies  Нэмэлт хөнгөн чип (навигаци)
     * @return array{ok:bool, mid:?string, error:?string}
     */
    public function sendButtonTemplate(SocialAccount $account, string $recipientId, string $text, array $buttons, array $quickReplies = []): array
    {
        $message = ['attachment' => ['type' => 'template', 'payload' => [
            'template_type' => 'button',
            'text' => mb_substr($text, 0, 640),
            'buttons' => array_slice(array_values($buttons), 0, 3),
        ]]];

        if (! empty($quickReplies)) {
            $message['quick_replies'] = collect($quickReplies)->take(13)->map(fn ($r) => [
                'content_type' => 'text',
                'title' => mb_substr($r['title'], 0, 20),
                'payload' => $r['payload'],
            ])->values()->all();
        }

        try {
            $response = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/messages", [
                'recipient' => ['id' => $recipientId],
                ...$this->envelope(),
                'message' => $message,
                'access_token' => $account->page_access_token,
            ]);

            if (! $response->successful()) {
                Log::warning('Meta sendButtonTemplate failed', ['recipient' => $recipientId, 'body' => $response->body()]);

                return ['ok' => false, 'mid' => null, 'error' => $response->json('error.message') ?? $response->body()];
            }

            return ['ok' => true, 'mid' => $response->json('message_id'), 'error' => null];
        } catch (\Throwable $e) {
            Log::error('Meta sendButtonTemplate exception', ['recipient' => $recipientId, 'error' => $e->getMessage()]);

            return ['ok' => false, 'mid' => null, 'error' => $e->getMessage()];
        }
    }

    /** Media (зураг гэх мэт) URL-ийн нийтийн суурь — META_MEDIA_URL байвал түүнийг, үгүй бол APP_URL. */
    private function mediaBase(): string
    {
        return rtrim((string) (config('services.meta.media_url') ?: config('app.url')), '/');
    }

    /**
     * Карусель (generic template) илгээх.
     *
     * @param  array<int, array<string, mixed>>  $elements
     * @return array{ok:bool, mid:?string, error:?string}
     */
    public function sendGenericTemplate(SocialAccount $account, string $recipientId, array $elements): array
    {
        $base = $this->mediaBase();
        foreach ($elements as &$el) {
            if (! empty($el['image_url']) && str_starts_with($el['image_url'], '/')) {
                $el['image_url'] = $base.$el['image_url'];
            }
        }
        unset($el);

        try {
            $response = Http::timeout(20)->post("{$this->base()}/{$account->page_id}/messages", [
                'recipient' => ['id' => $recipientId],
                ...$this->envelope(),
                'message' => ['attachment' => ['type' => 'template', 'payload' => ['template_type' => 'generic', 'elements' => array_values($elements)]]],
                'access_token' => $account->page_access_token,
            ]);

            if (! $response->successful()) {
                Log::warning('Meta sendGenericTemplate failed', ['recipient' => $recipientId, 'body' => $response->body()]);

                return ['ok' => false, 'mid' => null, 'error' => $response->json('error.message') ?? $response->body()];
            }

            return ['ok' => true, 'mid' => $response->json('message_id'), 'error' => null];
        } catch (\Throwable $e) {
            Log::error('Meta sendGenericTemplate exception', ['recipient' => $recipientId, 'error' => $e->getMessage()]);

            return ['ok' => false, 'mid' => null, 'error' => $e->getMessage()];
        }
    }

    /** "Бичиж байна…" төлөв илгээх. */
    public function sendTyping(SocialAccount $account, string $recipientId): void
    {
        try {
            Http::timeout(10)->post("{$this->base()}/{$account->page_id}/messages", [
                'recipient' => ['id' => $recipientId],
                'sender_action' => 'typing_on',
                'access_token' => $account->page_access_token,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Meta sendTyping failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Текст + quick reply товчнууд илгээх (Messenger + Instagram хоёуланд ажиллана).
     *
     * @param  array<int, array{title:string, payload:string}>  $replies
     * @return array{ok:bool, mid:?string, error:?string}
     */
    public function sendQuickReplies(SocialAccount $account, string $recipientId, string $text, array $replies): array
    {
        // Meta дээд тал нь 13 quick reply зөвшөөрнө. Title 20 тэмдэгтээр хязгаарлагдана.
        $quickReplies = collect($replies)->take(13)->map(fn ($r) => [
            'content_type' => 'text',
            'title' => mb_substr($r['title'], 0, 20),
            'payload' => $r['payload'],
        ])->values()->all();

        try {
            $response = Http::timeout(15)->post("{$this->base()}/{$account->page_id}/messages", [
                'recipient' => ['id' => $recipientId],
                ...$this->envelope(),
                'message' => [
                    'text' => $text,
                    'quick_replies' => $quickReplies,
                ],
                'access_token' => $account->page_access_token,
            ]);

            if (! $response->successful()) {
                Log::warning('Meta sendQuickReplies failed', ['recipient' => $recipientId, 'body' => $response->body()]);

                return ['ok' => false, 'mid' => null, 'error' => $response->json('error.message') ?? $response->body()];
            }

            return ['ok' => true, 'mid' => $response->json('message_id'), 'error' => null];
        } catch (\Throwable $e) {
            Log::error('Meta sendQuickReplies exception', ['recipient' => $recipientId, 'error' => $e->getMessage()]);

            return ['ok' => false, 'mid' => null, 'error' => $e->getMessage()];
        }
    }
}
