<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\Social\SendBroadcastJob;
use App\Models\Social\SocialBroadcast;
use App\Models\Social\SocialContact;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SocialBroadcastController extends Controller
{
    public function index(): Response
    {
        $broadcasts = SocialBroadcast::query()
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (SocialBroadcast $b) => $this->present($b));

        // Сегментэд ашиглах боломжит тэмдгүүд
        $tags = collect();
        SocialContact::whereNotNull('tags')->pluck('tags')->each(function ($t) use ($tags) {
            foreach ((array) $t as $x) {
                $x = trim((string) $x);
                if ($x !== '') {
                    $tags->push($x);
                }
            }
        });

        return Inertia::render('admin/Social/Broadcast', [
            'broadcasts' => $broadcasts,
            'tags' => $tags->unique()->values(),
            'total_contacts' => SocialContact::count(),
        ]);
    }

    /** Сегмент сонгоход хүрэх хүний тоог урьдчилан тооцоо (нийт + 24ц хүрэх боломжтой). */
    public function audience(Request $request): JsonResponse
    {
        $filters = $this->validateFilters($request);

        $total = $this->audienceQuery($filters)->count();
        $reachable = $this->audienceQuery($filters, true)->count();

        return response()->json(['total' => $total, 'reachable' => $reachable]);
    }

    /** Зураг upload (broadcast-д хавсаргах). */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:8192']]);
        $path = $request->file('image')->store('social/broadcasts', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    /** Broadcast үүсгэж recipients бэлдээд queue-д dispatch хийнэ. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:160',
            'text' => 'required|string|max:1800',
            'image_url' => 'nullable|string|max:1000',
            'button_label' => 'nullable|string|max:40',
            'button_url' => 'nullable|url|max:1000',
        ]);
        $filters = $this->validateFilters($request);

        $contactIds = $this->audienceQuery($filters)->pluck('social_contacts.id');
        if ($contactIds->isEmpty()) {
            return response()->json(['error' => 'Сонгосон сегментэд хүн алга байна.'], 422);
        }

        $broadcast = SocialBroadcast::create([
            'name' => $data['name'],
            'text' => $data['text'],
            'image_url' => $data['image_url'] ?? null,
            'button_label' => $data['button_label'] ?? null,
            'button_url' => $data['button_url'] ?? null,
            'filters' => $filters,
            'status' => SocialBroadcast::STATUS_SENDING,
            'total' => $contactIds->count(),
            'started_at' => now(),
        ]);

        // Recipient мөрүүдийг бөөнөөр (chunk) оруулна.
        $now = now();
        $contactIds->chunk(500)->each(function ($chunk) use ($broadcast, $now) {
            $rows = $chunk->map(fn ($id) => [
                'social_broadcast_id' => $broadcast->id,
                'social_contact_id' => $id,
                'status' => 'pending',
                'created_at' => $now,
                'updated_at' => $now,
            ])->all();
            \App\Models\Social\SocialBroadcastRecipient::insert($rows);
        });

        SendBroadcastJob::dispatch($broadcast->id);

        return response()->json(['ok' => true, 'broadcast' => $this->present($broadcast->fresh())]);
    }

    public function show(SocialBroadcast $broadcast): JsonResponse
    {
        return response()->json(['broadcast' => $this->present($broadcast)]);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    /** @return array{channel:string, gender:string, audience:string, tag:?string, only_reachable:bool} */
    private function validateFilters(Request $request): array
    {
        $v = $request->validate([
            'channel' => 'nullable|in:all,messenger,instagram',
            'gender' => 'nullable|in:all,male,female',
            'audience' => 'nullable|in:all,new,returning',
            'tag' => 'nullable|string|max:40',
            'only_reachable' => 'nullable|boolean',
        ]);

        return [
            'channel' => $v['channel'] ?? 'all',
            'gender' => $v['gender'] ?? 'all',
            'audience' => $v['audience'] ?? 'all',
            'tag' => $v['tag'] ?? null,
            'only_reachable' => (bool) ($v['only_reachable'] ?? false),
        ];
    }

    /** Сегментийн нөхцлөөр SocialContact query үүсгэнэ. */
    private function audienceQuery(array $filters, bool $forceReachable = false): Builder
    {
        $q = SocialContact::query();

        if ($filters['channel'] !== 'all') {
            $q->where('channel', $filters['channel']);
        }
        if ($filters['gender'] !== 'all') {
            $q->where('gender', $filters['gender']);
        }
        if ($filters['audience'] === 'new') {
            $q->where('created_at', '>=', now()->subDays(7));
        } elseif ($filters['audience'] === 'returning') {
            $q->where('created_at', '<', now()->subDays(7));
        }
        if (! empty($filters['tag'])) {
            $q->whereJsonContains('tags', $filters['tag']);
        }
        if ($forceReachable || $filters['only_reachable']) {
            $q->whereHas('conversation', fn (Builder $c) => $c->where('window_expires_at', '>', now()));
        }

        return $q;
    }

    /** @return array<string, mixed> */
    private function present(SocialBroadcast $b): array
    {
        return [
            'id' => $b->id,
            'name' => $b->name,
            'text' => $b->text,
            'image_url' => $b->image_url,
            'status' => $b->status,
            'total' => $b->total,
            'sent_count' => $b->sent_count,
            'failed_count' => $b->failed_count,
            'filters' => $b->filters,
            'created_at' => $b->created_at?->toIso8601String(),
            'finished_at' => $b->finished_at?->toIso8601String(),
        ];
    }
}
