<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialMessage;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class SocialDashboardController extends Controller
{
    public function index(): Response
    {
        $now = now();
        $weekAgo = $now->copy()->subDays(7);

        // ── KPI ──────────────────────────────────────────────────────────────
        $totalContacts = SocialContact::count();
        $newContacts7 = SocialContact::where('created_at', '>=', $weekAgo)->count();
        $newContacts30 = SocialContact::where('created_at', '>=', $now->copy()->subDays(30))->count();
        $returningContacts = max(0, $totalContacts - $newContacts7); // 7 хоногоос өмнө анх холбогдсон
        $reachable = SocialConversation::where('window_expires_at', '>', $now)->count();
        $activeConversations = SocialConversation::where('status', '!=', SocialConversation::STATUS_CLOSED)->count();

        // ── Мессеж ───────────────────────────────────────────────────────────
        $totalMessages = SocialMessage::count();
        $inMessages = SocialMessage::where('direction', SocialMessage::DIR_IN)->count();
        $outMessages = SocialMessage::where('direction', SocialMessage::DIR_OUT)->count();
        $botMessages = SocialMessage::where('sender', SocialMessage::SENDER_BOT)->count();
        $agentMessages = SocialMessage::where('sender', SocialMessage::SENDER_AGENT)->count();

        // ── Хүйс / суваг / төлөв ─────────────────────────────────────────────
        $genderCounts = SocialContact::selectRaw('gender, COUNT(*) as c')->groupBy('gender')->pluck('c', 'gender');
        $gender = [
            'male' => (int) ($genderCounts['male'] ?? 0),
            'female' => (int) ($genderCounts['female'] ?? 0),
            'unknown' => (int) ($totalContacts - (int) ($genderCounts['male'] ?? 0) - (int) ($genderCounts['female'] ?? 0)),
        ];

        $channelCounts = SocialContact::selectRaw('channel, COUNT(*) as c')->groupBy('channel')->pluck('c', 'channel');
        $channels = [
            'messenger' => (int) ($channelCounts['messenger'] ?? 0),
            'instagram' => (int) ($channelCounts['instagram'] ?? 0),
        ];

        $statusCounts = SocialConversation::selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status');
        $statuses = [
            'bot' => (int) ($statusCounts['bot'] ?? 0),
            'open' => (int) ($statusCounts['open'] ?? 0),
            'closed' => (int) ($statusCounts['closed'] ?? 0),
        ];

        // ── Өсөлт (сүүлийн 14 хоног, өдөр тутмын шинэ контакт) ───────────────
        $raw = SocialContact::where('created_at', '>=', $now->copy()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        $growth = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i);
            $key = $day->format('Y-m-d');
            $growth[] = [
                'date' => $day->format('m/d'),
                'count' => (int) ($raw[$key] ?? 0),
            ];
        }

        // ── Top tags (JSON-оос PHP талд тоолно) ──────────────────────────────
        $tagCounts = [];
        SocialContact::whereNotNull('tags')->pluck('tags')->each(function ($tags) use (&$tagCounts) {
            foreach ((array) $tags as $t) {
                $t = trim((string) $t);
                if ($t !== '') {
                    $tagCounts[$t] = ($tagCounts[$t] ?? 0) + 1;
                }
            }
        });
        arsort($tagCounts);
        $topTags = collect($tagCounts)->take(8)->map(fn ($c, $t) => ['tag' => $t, 'count' => $c])->values();

        return Inertia::render('admin/Social/Dashboard', [
            'stats' => [
                'total_contacts' => $totalContacts,
                'new_7' => $newContacts7,
                'new_30' => $newContacts30,
                'returning' => $returningContacts,
                'reachable' => $reachable,
                'active_conversations' => $activeConversations,
                'total_messages' => $totalMessages,
                'in_messages' => $inMessages,
                'out_messages' => $outMessages,
                'bot_messages' => $botMessages,
                'agent_messages' => $agentMessages,
            ],
            'gender' => $gender,
            'channels' => $channels,
            'statuses' => $statuses,
            'growth' => $growth,
            'topTags' => $topTags,
        ]);
    }
}
