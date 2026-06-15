<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialAccount;
use App\Services\AuditService;
use App\Services\Social\MetaGraphService;
use App\Services\Social\SocialFlowRunner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Facebook Login (OAuth) — админ Page + Instagram-аа холбоно.
 */
class SocialOAuthController extends Controller
{
    public function __construct(
        private readonly MetaGraphService $meta,
        private readonly SocialFlowRunner $runner,
    ) {}

    /** Facebook login руу чиглүүлэх. */
    public function connect(Request $request): RedirectResponse
    {
        if (empty(config('services.meta.app_id')) || empty(config('services.meta.app_secret'))) {
            return redirect()->route('admin.social.accounts')
                ->with('error', 'META_APP_ID / META_APP_SECRET тохируулаагүй байна (.env).');
        }

        $state = Str::random(40);
        $request->session()->put('meta_oauth_state', $state);

        $url = $this->meta->buildLoginUrl($this->redirectUri(), $state);

        return redirect()->away($url);
    }

    /** Facebook-аас буцаж ирэх. */
    public function callback(Request $request): RedirectResponse
    {
        // Хэрэглэгч цуцалсан / алдаа
        if ($request->filled('error')) {
            return redirect()->route('admin.social.accounts')
                ->with('error', 'Холболт цуцлагдлаа: '.$request->query('error_description', $request->query('error')));
        }

        // State шалгах (CSRF)
        $state = $request->query('state');
        if (! $state || $state !== $request->session()->pull('meta_oauth_state')) {
            return redirect()->route('admin.social.accounts')->with('error', 'Холболтын state таарсангүй. Дахин оролдоно уу.');
        }

        $code = $request->query('code');
        if (! $code) {
            return redirect()->route('admin.social.accounts')->with('error', 'Facebook code ирсэнгүй.');
        }

        try {
            $userToken = $this->meta->exchangeCodeForToken($code, $this->redirectUri());
            $userToken = $this->meta->longLivedUserToken($userToken);
            $pages = $this->meta->fetchPages($userToken);
        } catch (\Throwable $e) {
            Log::error('Social OAuth callback failed', ['error' => $e->getMessage()]);

            return redirect()->route('admin.social.accounts')->with('error', 'Холболт амжилтгүй: '.$e->getMessage());
        }

        if (empty($pages)) {
            return redirect()->route('admin.social.accounts')
                ->with('error', 'Холбогдох Facebook Page олдсонгүй. Page дээр эрхтэй эсэхээ шалгана уу.');
        }

        // Page-үүдийг сессэд хадгалаад "аль хуудсаа холбох вэ" сонголтын дэлгэц рүү чиглүүлнэ.
        $request->session()->put('meta_oauth_pages', $pages);

        return redirect()->route('admin.social.select');
    }

    /** Татсан Page-үүдээс аль нэгийг сонгох дэлгэц. */
    public function select(Request $request): RedirectResponse|\Inertia\Response
    {
        $pages = $request->session()->get('meta_oauth_pages');

        if (empty($pages)) {
            return redirect()->route('admin.social.accounts')
                ->with('error', 'Сонгох хуудас олдсонгүй. Дахин холбоно уу.');
        }

        $connectedIds = SocialAccount::pluck('page_id')->all();

        return Inertia::render('admin/Social/SelectPages', [
            'pages' => collect($pages)->map(fn ($p) => [
                'page_id' => $p['page_id'],
                'page_name' => $p['page_name'],
                'ig_username' => $p['ig_username'],
                'avatar' => $p['avatar'],
                'already_connected' => in_array($p['page_id'], $connectedIds, true),
            ])->values(),
        ]);
    }

    /** Сонгосон Page-үүдийг хадгалж, webhook-д бүртгэх. */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'page_ids' => 'required|array|min:1',
            'page_ids.*' => 'string',
        ]);

        $pages = collect($request->session()->get('meta_oauth_pages', []))
            ->keyBy('page_id');

        if ($pages->isEmpty()) {
            return redirect()->route('admin.social.accounts')
                ->with('error', 'Сессийн хугацаа дууссан байна. Дахин холбоно уу.');
        }

        $connected = 0;
        foreach ($data['page_ids'] as $pageId) {
            $page = $pages->get($pageId);
            if (! $page) {
                continue;
            }

            $account = SocialAccount::updateOrCreate(
                ['page_id' => $page['page_id']],
                [
                    'page_name' => $page['page_name'],
                    'page_access_token' => $page['page_access_token'],
                    'ig_id' => $page['ig_id'],
                    'ig_username' => $page['ig_username'],
                    'avatar' => $page['avatar'],
                    'is_active' => true,
                    'connected_by' => $request->user()?->id,
                ]
            );

            $subscribed = $this->meta->subscribePageWebhook($account);
            $account->update(['webhook_subscribed' => $subscribed]);

            // Messenger "Get Started" + Ice Breakers + Persistent Menu (үндсэн цэснээс үүсгэнэ).
            if ($account->page_id) {
                $this->meta->setMessengerProfile($account, 'Сайн байна уу! 👋', $this->runner->buildMenuItems($account));
            }

            $connected++;
        }

        $request->session()->forget('meta_oauth_pages');

        AuditService::log('connected', null, null, ['pages' => $connected], "Social: {$connected} хуудас холболоо");

        return redirect()->route('admin.social.accounts')
            ->with('success', "{$connected} хуудас амжилттай холбогдлоо.");
    }

    private function redirectUri(): string
    {
        return route('admin.social.oauth.callback');
    }
}
