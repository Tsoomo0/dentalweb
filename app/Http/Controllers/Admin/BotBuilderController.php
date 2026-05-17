<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bot\BotButton;
use App\Models\Bot\BotFlow;
use App\Models\Bot\BotNode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Bot Builder — admin UI manages topics (flows) + Q&A. Buttons are auto-managed
 * to keep the UX simple. Each new topic auto-creates its menu node + a welcome
 * button. Each new Q&A auto-creates its menu button + 3 back/handoff buttons.
 */
class BotBuilderController extends Controller
{
    public function index(): InertiaResponse
    {
        $flows = BotFlow::query()
            ->orderBy('sort_order')
            ->with(['nodes' => fn ($q) => $q->orderBy('id'), 'nodes.buttons' => fn ($q) => $q->orderBy('sort_order')])
            ->get();

        $welcomeNode = BotNode::query()
            ->whereNull('flow_id')->where('is_welcome', true)
            ->with(['buttons' => fn ($q) => $q->orderBy('sort_order')])
            ->first();

        return Inertia::render('admin/BotBuilder/Index', [
            'flows' => $flows,
            'welcomeNode' => $welcomeNode,
        ]);
    }

    // ── Welcome ──────────────────────────────────────────────────────────────

    public function updateWelcome(Request $request): JsonResponse
    {
        $welcome = BotNode::query()
            ->whereNull('flow_id')->where('is_welcome', true)
            ->firstOrFail();

        $data = $request->validate(['body' => 'required|string|max:4000']);
        $welcome->update($data);

        return response()->json(['node' => $welcome->fresh()]);
    }

    // ── Flow ─────────────────────────────────────────────────────────────────

    public function storeFlow(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'icon' => 'nullable|string|max:8',
        ]);

        return DB::transaction(function () use ($data) {
            $key = $this->uniqueFlowKey($data['name']);
            $sort = (int) (BotFlow::max('sort_order') ?? 0) + 1;

            $flow = BotFlow::create([
                'key' => $key,
                'name' => $data['name'],
                'icon' => $data['icon'] ?? null,
                'is_active' => true,
                'sort_order' => $sort,
            ]);

            // Auto-create the topic's menu node.
            $menu = BotNode::create([
                'flow_id' => $flow->id,
                'key' => 'menu',
                'title' => $flow->name,
                'body' => ($flow->icon ? $flow->icon.' ' : '').$flow->name.' — асуултаа сонгоно уу:',
                'is_welcome' => true,
            ]);

            // Add a default "go back" button on the menu.
            BotButton::create([
                'node_id' => $menu->id,
                'label' => 'Үндсэн цэс',
                'icon' => '🔙',
                'action' => BotButton::ACTION_BACK,
                'sort_order' => 99,
            ]);

            // Add a welcome button (in the global welcome node) that opens this topic.
            $welcome = BotNode::query()->whereNull('flow_id')->where('is_welcome', true)->first();
            if ($welcome) {
                $this->ensureWelcomeButtonForFlow($welcome, $flow);
            }

            return response()->json(['flow' => $flow->fresh(['nodes.buttons'])]);
        });
    }

    public function updateFlow(BotFlow $flow, Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'icon' => 'nullable|string|max:8',
        ]);

        return DB::transaction(function () use ($flow, $data) {
            $flow->update($data);

            // Keep the welcome button label in sync.
            $welcome = BotNode::query()->whereNull('flow_id')->where('is_welcome', true)->first();
            if ($welcome) {
                BotButton::query()
                    ->where('node_id', $welcome->id)
                    ->where('target_flow_id', $flow->id)
                    ->update([
                        'label' => $flow->name,
                        'icon' => $flow->icon,
                    ]);
            }

            return response()->json(['flow' => $flow->fresh()]);
        });
    }

    public function destroyFlow(BotFlow $flow): JsonResponse
    {
        DB::transaction(function () use ($flow) {
            // Drop the welcome button pointing to this flow.
            BotButton::query()->where('target_flow_id', $flow->id)->delete();
            // Cascade deletes the flow's nodes, which cascade their own buttons.
            $flow->delete();
        });

        return response()->json(['ok' => true]);
    }

    // ── Q&A node ─────────────────────────────────────────────────────────────

    public function storeNode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'flow_id' => 'required|integer|exists:bot_flows,id',
            'title' => 'required|string|max:120',
            'body' => 'required|string|max:4000',
        ]);

        return DB::transaction(function () use ($data) {
            $flow = BotFlow::findOrFail($data['flow_id']);
            $menu = $flow->nodes()->where('is_welcome', true)->first();

            $key = $this->uniqueNodeKey($flow->id, $data['title']);
            $node = BotNode::create([
                'flow_id' => $flow->id,
                'key' => $key,
                'title' => $data['title'],
                'body' => $data['body'],
            ]);

            // Default back-buttons under the answer.
            BotButton::create([
                'node_id' => $node->id,
                'label' => 'Өөр асуулт',
                'icon' => '🔁',
                'action' => BotButton::ACTION_NEXT_NODE,
                'target_node_id' => $menu?->id,
                'sort_order' => 1,
            ]);
            BotButton::create([
                'node_id' => $node->id,
                'label' => 'Админтай холбогдох',
                'icon' => '👨‍💼',
                'action' => BotButton::ACTION_HANDOFF,
                'sort_order' => 2,
            ]);
            BotButton::create([
                'node_id' => $node->id,
                'label' => 'Үндсэн цэс',
                'icon' => '🔙',
                'action' => BotButton::ACTION_BACK,
                'sort_order' => 3,
            ]);

            // Add this Q&A as a button in the menu (so users see it as a choice).
            if ($menu) {
                $nextSort = (int) (BotButton::query()
                    ->where('node_id', $menu->id)
                    ->where('action', '!=', BotButton::ACTION_BACK)
                    ->max('sort_order') ?? 0) + 1;

                BotButton::create([
                    'node_id' => $menu->id,
                    'label' => $node->title,
                    'icon' => null,
                    'action' => BotButton::ACTION_NEXT_NODE,
                    'target_node_id' => $node->id,
                    'sort_order' => $nextSort,
                ]);
            }

            return response()->json(['node' => $node->fresh('buttons')]);
        });
    }

    public function updateNode(BotNode $node, Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:120',
            'body' => 'sometimes|string|max:4000',
        ]);

        return DB::transaction(function () use ($node, $data) {
            $node->update($data);

            // Keep the menu button label in sync with the title.
            if (isset($data['title']) && $node->flow_id) {
                BotButton::query()
                    ->where('target_node_id', $node->id)
                    ->where('action', BotButton::ACTION_NEXT_NODE)
                    ->update(['label' => $node->title]);
            }

            return response()->json(['node' => $node->fresh('buttons')]);
        });
    }

    public function destroyNode(BotNode $node): JsonResponse
    {
        DB::transaction(function () use ($node) {
            // Remove buttons in the menu pointing at this Q&A.
            BotButton::query()->where('target_node_id', $node->id)->delete();
            $node->delete();
        });

        return response()->json(['ok' => true]);
    }

    // ── Menu (topic intro) ───────────────────────────────────────────────────

    public function updateMenu(BotFlow $flow, Request $request): JsonResponse
    {
        $data = $request->validate(['body' => 'required|string|max:4000']);
        $menu = $flow->nodes()->where('is_welcome', true)->firstOrFail();
        $menu->update($data);

        return response()->json(['node' => $menu->fresh()]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    protected function uniqueFlowKey(string $name): string
    {
        $base = Str::slug($name) ?: 'topic';
        $candidate = $base;
        $i = 2;
        while (BotFlow::query()->where('key', $candidate)->exists()) {
            $candidate = $base.'-'.$i++;
        }

        return $candidate;
    }

    protected function uniqueNodeKey(int $flowId, string $title): string
    {
        $base = Str::slug($title) ?: 'q';
        $base = Str::limit($base, 40, '');
        $candidate = $base;
        $i = 2;
        while (BotNode::query()->where('flow_id', $flowId)->where('key', $candidate)->exists()) {
            $candidate = $base.'-'.$i++;
        }

        return $candidate;
    }

    protected function ensureWelcomeButtonForFlow(BotNode $welcome, BotFlow $flow): void
    {
        $exists = BotButton::query()
            ->where('node_id', $welcome->id)
            ->where('target_flow_id', $flow->id)
            ->exists();

        if ($exists) {
            return;
        }

        // Insert before the handoff button (sort_order=99).
        $maxBeforeHandoff = (int) (BotButton::query()
            ->where('node_id', $welcome->id)
            ->where('action', '!=', BotButton::ACTION_HANDOFF)
            ->max('sort_order') ?? 0) + 1;

        BotButton::create([
            'node_id' => $welcome->id,
            'label' => $flow->name,
            'icon' => $flow->icon,
            'action' => BotButton::ACTION_FLOW_START,
            'target_flow_id' => $flow->id,
            'sort_order' => $maxBeforeHandoff,
        ]);
    }
}
