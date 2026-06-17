<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialAccount;
use App\Models\Social\SocialFlow;
use App\Models\Social\SocialFlowButton;
use App\Models\Social\SocialFlowNode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Social flow builder — ManyChat маягийн автомат хариултын урсгал удирдана.
 */
class SocialFlowController extends Controller
{
    public function index(): Response
    {
        $flows = SocialFlow::query()
            ->orderBy('sort_order')->orderBy('id')
            ->with(['nodes' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'), 'nodes.buttons'])
            ->get();

        $accounts = SocialAccount::query()
            ->where('is_active', true)
            ->get(['id', 'page_name', 'ig_username']);

        // Node бүрийн аналитик (Sent / Delivered / Opened)
        $nodeIds = $flows->pluck('nodes')->flatten()->pluck('id');
        $analytics = \App\Models\Social\SocialMessage::query()
            ->whereIn('flow_node_id', $nodeIds)
            ->where('direction', 'out')
            ->selectRaw('flow_node_id, COUNT(*) as sent, SUM(delivered_at IS NOT NULL) as delivered, SUM(read_at IS NOT NULL) as opened')
            ->groupBy('flow_node_id')
            ->get()
            ->keyBy('flow_node_id')
            ->map(fn ($r) => [
                'sent' => (int) $r->sent,
                'delivered' => (int) $r->delivered,
                'opened' => (int) $r->opened,
            ]);

        return Inertia::render('admin/Social/FlowBuilder', [
            'flows' => $flows,
            'accounts' => $accounts,
            'analytics' => $analytics,
            'tokens' => \App\Services\Social\PersonalizationResolver::builtinTokens(),
            'forms' => \App\Models\Social\SocialForm::where('is_active', true)->get(['id', 'name']),
        ]);
    }

    // ── Flow ─────────────────────────────────────────────────────────────────

    public function storeFlow(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'icon' => 'nullable|string|max:8',
            'trigger_type' => 'required|in:welcome,keyword,default',
            'keywords' => 'nullable|array',
            'keywords.*' => 'string|max:60',
            'social_account_id' => 'nullable|integer|exists:social_accounts,id',
        ]);

        return DB::transaction(function () use ($data) {
            $flow = SocialFlow::create([
                'social_account_id' => $data['social_account_id'] ?? null,
                'key' => $this->uniqueKey($data['name']),
                'name' => $data['name'],
                'icon' => $data['icon'] ?? null,
                'trigger_type' => $data['trigger_type'],
                'keywords' => $data['keywords'] ?? [],
                'is_active' => true,
                'sort_order' => (int) (SocialFlow::max('sort_order') ?? 0) + 1,
            ]);

            // Эхлэлийн node автоматаар үүсгэнэ.
            SocialFlowNode::create([
                'flow_id' => $flow->id,
                'key' => 'entry',
                'title' => 'Угтах мессеж',
                'body' => 'Сайн байна уу 👋',
                'is_entry' => true,
            ]);

            return response()->json(['flow' => $flow->fresh(['nodes.buttons'])]);
        });
    }

    public function updateFlow(SocialFlow $flow, Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'icon' => 'nullable|string|max:8',
            'trigger_type' => 'sometimes|in:welcome,keyword,default',
            'keywords' => 'nullable|array',
            'keywords.*' => 'string|max:60',
            'is_active' => 'sometimes|boolean',
            'social_account_id' => 'nullable|integer|exists:social_accounts,id',
        ]);

        $flow->update($data);

        return response()->json(['flow' => $flow->fresh(['nodes.buttons'])]);
    }

    public function destroyFlow(SocialFlow $flow): JsonResponse
    {
        $flow->delete();

        return response()->json(['ok' => true]);
    }

    // ── Node ─────────────────────────────────────────────────────────────────

    public function storeNode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'flow_id' => 'required|integer|exists:social_flows,id',
            'type' => 'nullable|in:message,image,question,action,condition,delay,carousel,media,file,typing',
            'title' => 'nullable|string|max:120',
            'body' => 'nullable|string|max:2000',
            'position_x' => 'nullable|integer',
            'position_y' => 'nullable|integer',
        ]);

        $node = SocialFlowNode::create([
            'flow_id' => $data['flow_id'],
            'type' => $data['type'] ?? SocialFlowNode::TYPE_MESSAGE,
            'title' => $data['title'] ?? null,
            'body' => $data['body'] ?? '',
            'is_entry' => false,
            'position_x' => $data['position_x'] ?? 0,
            'position_y' => $data['position_y'] ?? 0,
            'sort_order' => (int) (SocialFlowNode::where('flow_id', $data['flow_id'])->max('sort_order') ?? 0) + 1,
        ]);

        return response()->json(['node' => $node->fresh('buttons')]);
    }

    /** Блокийг (бүх талбар + товчнуудтай) хуулбарлана — Copy/Paste-д ашиглана. */
    public function duplicateNode(SocialFlowNode $node): JsonResponse
    {
        $clone = $node->replicate();
        $clone->is_entry = false; // хуулбар хэзээ ч эхлэл биш
        $clone->sent_count = 0;
        $clone->position_x = $node->position_x + 40;
        $clone->position_y = $node->position_y + 40;
        $clone->sort_order = (int) (SocialFlowNode::where('flow_id', $node->flow_id)->max('sort_order') ?? 0) + 1;
        $clone->save();

        // Товчнуудыг хуулна (target_node_id хэвээр — ижил дараагийн блок руу заана).
        foreach ($node->buttons as $btn) {
            $b = $btn->replicate();
            $b->node_id = $clone->id;
            $b->click_count = 0;
            $b->save();
        }

        return response()->json(['node' => $clone->fresh('buttons')]);
    }

    /** Зураг upload — public disk дээр хадгалж URL буцаана. */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:8192'],
            'mode' => ['nullable', 'in:original,standard'],
        ]);

        $file = $request->file('image');
        $mode = $request->input('mode', 'standard');

        // Хоёр хувилбарыг хоёуланг нь үүсгэнэ — builder дээр toggle хийхэд шууд солих боломжтой.
        $size = @getimagesize($file->getRealPath()) ?: [null, null];
        $standardPath = $this->storeStandardImage($file);          // 1.91:1 (1080×566)
        $originalPath = $file->store('social', 'public');          // оригинал хэвээр

        $standard = ['url' => Storage::disk('public')->url($standardPath), 'w' => 1080, 'h' => 566];
        $original = ['url' => Storage::disk('public')->url($originalPath), 'w' => $size[0], 'h' => $size[1]];

        return response()->json([
            'url' => $mode === 'original' ? $original['url'] : $standard['url'],
            'standard' => $standard,
            'original' => $original,
        ]);
    }

    /** Зургийг 1.91:1 (1080×566) харьцаагаар голлон таслаж, JPEG (чанар 85)-аар хадгална. */
    private function storeStandardImage(\Illuminate\Http\UploadedFile $file): string
    {
        [$tw, $th] = [1080, 566]; // 1.91:1 — Facebook/Messenger картын стандарт харьцаа

        $mime = $file->getMimeType();
        $realPath = $file->getRealPath();
        $src = match ($mime) {
            'image/png' => imagecreatefrompng($realPath),
            'image/webp' => imagecreatefromwebp($realPath),
            'image/gif' => imagecreatefromgif($realPath),
            default => imagecreatefromjpeg($realPath),
        };

        if (! $src) {
            // GD дэмжихгүй бол оригиналаар хадгална.
            return $file->store('social', 'public');
        }

        $sw = imagesx($src);
        $sh = imagesy($src);
        $targetRatio = $tw / $th;
        $srcRatio = $sw / max($sh, 1);

        if ($srcRatio > $targetRatio) { // эх зураг илүү өргөн → хажуу талыг тасална
            $cropW = (int) round($sh * $targetRatio);
            $cropH = $sh;
            $cropX = (int) round(($sw - $cropW) / 2);
            $cropY = 0;
        } else { // илүү өндөр → дээд/доод талыг тасална
            $cropW = $sw;
            $cropH = (int) round($sw / $targetRatio);
            $cropX = 0;
            $cropY = (int) round(($sh - $cropH) / 2);
        }

        $dst = imagecreatetruecolor($tw, $th);
        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefilledrectangle($dst, 0, 0, $tw, $th, $white);
        imagecopyresampled($dst, $src, 0, 0, $cropX, $cropY, $tw, $th, $cropW, $cropH);

        $relative = 'social/'.\Illuminate\Support\Str::random(40).'.jpg';
        $tmp = tempnam(sys_get_temp_dir(), 'simg');
        imagejpeg($dst, $tmp, 85);
        Storage::disk('public')->put($relative, (string) file_get_contents($tmp));

        @unlink($tmp);
        imagedestroy($src);
        imagedestroy($dst);

        return $relative;
    }

    /** Видео / файл upload (медиа, файл блокт). */
    public function uploadFile(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:51200'], // 50MB
        ]);

        $path = $request->file('file')->store('social/files', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    /** Canvas дээрх node-уудын байрлалыг багцаар хадгална. */
    public function savePositions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'positions' => 'required|array',
            'positions.*.id' => 'required|integer|exists:social_flow_nodes,id',
            'positions.*.x' => 'required|integer',
            'positions.*.y' => 'required|integer',
        ]);

        foreach ($data['positions'] as $pos) {
            SocialFlowNode::where('id', $pos['id'])->update([
                'position_x' => $pos['x'],
                'position_y' => $pos['y'],
            ]);
        }

        return response()->json(['ok' => true]);
    }

    /** Товчийг node-той холбох (canvas дээр утас зурахад). */
    public function linkButton(SocialFlowButton $button, Request $request): JsonResponse
    {
        $data = $request->validate([
            'target_node_id' => 'required|integer|exists:social_flow_nodes,id',
        ]);

        $button->update([
            'action' => SocialFlowButton::ACTION_NEXT_NODE,
            'target_node_id' => $data['target_node_id'],
            'target_flow_id' => null,
            'url' => null,
        ]);

        return response()->json(['button' => $button->fresh()]);
    }

    /** Холболтыг салгах (canvas дээр утас устгахад). */
    public function unlinkButton(SocialFlowButton $button): JsonResponse
    {
        $button->update(['target_node_id' => null]);

        return response()->json(['button' => $button->fresh()]);
    }

    public function updateNode(SocialFlowNode $node, Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'sometimes|in:message,image,question,action,condition,delay,carousel,media,file,typing',
            'title' => 'nullable|string|max:120',
            'body' => 'nullable|string|max:2000',
            'image_url' => 'nullable|string|max:1000',
            'cards' => 'nullable|array',
            'keywords' => 'nullable|array',
            'keywords.*' => 'string|max:60',
            'next_node_id' => 'nullable|integer|exists:social_flow_nodes,id',
            'save_field' => 'nullable|string|max:60',
            'action_type' => 'nullable|in:set_field,add_tag,remove_tag,mark_open,start_flow',
            'action_field' => 'nullable|string|max:60',
            'action_value' => 'nullable|string|max:255',
            'action_flow_id' => 'nullable|integer|exists:social_flows,id',
            'delay_seconds' => 'nullable|integer|min:1|max:2592000',
            'condition_type' => 'nullable|in:has_tag,field_equals,field_contains',
            'condition_field' => 'nullable|string|max:60',
            'condition_value' => 'nullable|string|max:255',
            'yes_node_id' => 'nullable|integer|exists:social_flow_nodes,id',
            'no_node_id' => 'nullable|integer|exists:social_flow_nodes,id',
            'is_entry' => 'sometimes|boolean',
        ]);

        return DB::transaction(function () use ($node, $data) {
            if (! empty($data['is_entry'])) {
                SocialFlowNode::where('flow_id', $node->flow_id)->update(['is_entry' => false]);
            }

            $node->update($data);

            return response()->json(['node' => $node->fresh('buttons')]);
        });
    }

    public function destroyNode(SocialFlowNode $node): JsonResponse
    {
        $node->delete();

        return response()->json(['ok' => true]);
    }

    // ── Button ───────────────────────────────────────────────────────────────

    public function storeButton(Request $request): JsonResponse
    {
        $data = $this->validateButton($request);
        $data['sort_order'] = (int) (SocialFlowButton::where('node_id', $data['node_id'])->max('sort_order') ?? 0) + 1;

        $button = SocialFlowButton::create($data);

        return response()->json(['button' => $button]);
    }

    public function updateButton(SocialFlowButton $button, Request $request): JsonResponse
    {
        $data = $this->validateButton($request, $button->node_id);
        $button->update($data);

        return response()->json(['button' => $button->fresh()]);
    }

    public function destroyButton(SocialFlowButton $button): JsonResponse
    {
        $button->delete();

        return response()->json(['ok' => true]);
    }

    /** Товчнуудын дарааллыг шинэчлэх (дээш/доош зөөх). */
    public function reorderButtons(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:social_flow_buttons,id',
        ]);

        foreach ($data['ids'] as $i => $id) {
            SocialFlowButton::where('id', $id)->update(['sort_order' => $i]);
        }

        return response()->json(['ok' => true]);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function validateButton(Request $request, ?int $nodeId = null): array
    {
        $rules = [
            'label' => 'required|string|max:40',
            'action' => 'required|in:next_node,flow_start,handoff,url,web_form,call',
            'is_quick_reply' => 'sometimes|boolean',
            'target_node_id' => 'nullable|integer|exists:social_flow_nodes,id',
            'target_flow_id' => 'nullable|integer|exists:social_flows,id',
            'target_form_id' => 'nullable|integer|exists:social_forms,id',
            'url' => 'nullable|url|max:500',
            'phone' => 'nullable|string|max:40',
        ];

        if ($nodeId === null) {
            $rules['node_id'] = 'required|integer|exists:social_flow_nodes,id';
        }

        $data = $request->validate($rules);

        // Action-д хамаарахгүй талбаруудыг цэвэрлэнэ.
        $data['target_node_id'] = $data['action'] === 'next_node' ? ($data['target_node_id'] ?? null) : null;
        $data['target_flow_id'] = $data['action'] === 'flow_start' ? ($data['target_flow_id'] ?? null) : null;
        $data['target_form_id'] = $data['action'] === 'web_form' ? ($data['target_form_id'] ?? null) : null;
        $data['url'] = $data['action'] === 'url' ? ($data['url'] ?? null) : null;
        $data['phone'] = $data['action'] === 'call' ? ($data['phone'] ?? null) : null;

        // Quick reply зөвхөн навигацид (next_node/flow_start/handoff) тохирно.
        $data['is_quick_reply'] = ($data['is_quick_reply'] ?? false)
            && in_array($data['action'], ['next_node', 'flow_start', 'handoff'], true);

        return $data;
    }

    private function uniqueKey(string $name): string
    {
        $base = Str::slug($name) ?: 'flow';
        $candidate = $base;
        $i = 2;
        while (SocialFlow::where('key', $candidate)->exists()) {
            $candidate = $base.'-'.$i++;
        }

        return $candidate;
    }
}
