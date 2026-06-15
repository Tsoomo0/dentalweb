<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialAccount;
use App\Services\AuditService;
use App\Services\Social\MetaGraphService;
use App\Services\Social\SocialFlowRunner;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SocialAccountController extends Controller
{
    public function __construct(
        private readonly MetaGraphService $meta,
        private readonly SocialFlowRunner $runner,
    ) {}

    public function index(): Response
    {
        $accounts = SocialAccount::query()
            ->orderByDesc('is_active')
            ->orderBy('page_name')
            ->get()
            ->map(fn (SocialAccount $a) => [
                'id' => $a->id,
                'page_id' => $a->page_id,
                'page_name' => $a->page_name,
                'ig_id' => $a->ig_id,
                'ig_username' => $a->ig_username,
                'avatar' => $a->avatar,
                'is_active' => $a->is_active,
                'webhook_subscribed' => $a->webhook_subscribed,
                'connected_at' => $a->created_at?->toDateTimeString(),
            ]);

        return Inertia::render('admin/Social/Accounts', [
            'accounts' => $accounts,
            'configured' => ! empty(config('services.meta.app_id')) && ! empty(config('services.meta.app_secret')),
            'webhook_url' => url('/webhooks/social'),
            'callback_url' => route('admin.social.oauth.callback'),
        ]);
    }

    /** Webhook-д дахин бүртгэх (subscribe). */
    public function resubscribe(SocialAccount $account): RedirectResponse
    {
        $ok = $this->meta->subscribePageWebhook($account);
        $account->update(['webhook_subscribed' => $ok]);

        // Messenger "Get Started" + Ice Breakers + Persistent Menu (үндсэн цэснээс үүсгэнэ).
        if ($account->page_id) {
            $this->meta->setMessengerProfile($account, 'Сайн байна уу! 👋', $this->runner->buildMenuItems($account));
        }

        return back()->with($ok ? 'success' : 'error',
            $ok ? 'Webhook дахин бүртгэгдлээ.' : 'Webhook бүртгэл амжилтгүй.');
    }

    /** Холболт салгах. */
    public function destroy(SocialAccount $account): RedirectResponse
    {
        $name = $account->page_name;
        $account->delete();

        AuditService::log('disconnected', null, null, ['page' => $name], "Social: {$name} салгалаа");

        return back()->with('success', "{$name} салгагдлаа.");
    }
}
