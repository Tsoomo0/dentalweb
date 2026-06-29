<?php

namespace App\Http\Controllers\Admin;

use App\Events\Social\SocialMessageReceived;
use App\Http\Controllers\Controller;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialFlow;
use App\Models\Social\SocialFlowNode;
use App\Models\Social\SocialMessage;
use App\Services\Social\MetaGraphService;
use App\Services\Social\SocialFlowRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SocialInboxController extends Controller
{
    public function __construct(private readonly MetaGraphService $meta) {}

    public function index(): Response
    {
        return Inertia::render('admin/Social/Inbox', [
            'conversations' => $this->conversationList(),
        ]);
    }

    /** Харилцааны жагсаалт (poll / Echo дараа дахин ачаалахад). */
    public function conversations(): JsonResponse
    {
        return response()->json(['conversations' => $this->conversationList()]);
    }

    /** Нэг харилцааны мессежүүд. */
    public function messages(SocialConversation $conversation): JsonResponse
    {
        $messages = $conversation->messages()
            ->orderBy('id')
            ->limit(200)
            ->get()
            ->map(fn (SocialMessage $m) => [
                'id' => $m->id,
                'direction' => $m->direction,
                'sender' => $m->sender,
                'type' => $m->type,
                'text' => $m->text,
                'attachments' => $m->attachments,
                'flow_node_id' => $m->flow_node_id,
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return response()->json(['messages' => $messages]);
    }

    /** Оператор хариу илгээх. */
    public function reply(SocialConversation $conversation, Request $request): JsonResponse
    {
        $data = $request->validate(['text' => 'required|string|max:2000']);

        $conversation->loadMissing(['account', 'contact']);

        // 24ц цонх хаагдсан бол операторын хариуг HUMAN_AGENT tag-аар (7 хоног) илгээнэ.
        $this->meta->useMessagingTag($conversation->windowOpen() ? null : 'HUMAN_AGENT');

        $result = $this->meta->sendText(
            $conversation->account,
            $conversation->contact->external_id,
            $data['text'],
        );

        if (! $result['ok']) {
            return response()->json(['error' => 'Илгээж чадсангүй: '.($result['error'] ?? 'тодорхойгүй алдаа')], 422);
        }

        $message = SocialMessage::create([
            'social_conversation_id' => $conversation->id,
            'direction' => SocialMessage::DIR_OUT,
            'sender' => SocialMessage::SENDER_AGENT,
            'type' => 'text',
            'text' => $data['text'],
            'external_mid' => $result['mid'],
            'sent_by_user_id' => $request->user()?->id,
            'delivered_at' => now(),
        ]);

        $conversation->update([
            'last_message_text' => mb_substr($data['text'], 0, 1000),
            'last_message_at' => now(),
            // Оператор гараар хариулсан ч ботыг зогсоохгүй — бот зөвхөн handoff
            // (Оператортой холбогдох) эсвэл "Оператор авах" товчоор л зогсоно.
        ]);

        try {
            broadcast(new SocialMessageReceived($message));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Social broadcast failed', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => [
                'id' => $message->id,
                'direction' => $message->direction,
                'sender' => $message->sender,
                'type' => $message->type,
                'text' => $message->text,
                'created_at' => $message->created_at?->toIso8601String(),
            ],
        ]);
    }

    /** Хавсралт (зураг/файл/дуу) илгээх. */
    public function attach(SocialConversation $conversation, Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:25600'], // 25MB
            'kind' => ['required', 'in:image,audio,video,file'],
        ]);

        $conversation->loadMissing(['account', 'contact']);

        $path = $request->file('file')->store('social/inbox', 'public');
        $url = Storage::disk('public')->url($path); // '/storage/...' (public диск, default биш)

        // 24ц цонх хаагдсан бол операторын хавсралтыг HUMAN_AGENT tag-аар (7 хоног) илгээнэ.
        $this->meta->useMessagingTag($conversation->windowOpen() ? null : 'HUMAN_AGENT');

        $result = $this->meta->sendAttachment($conversation->account, $conversation->contact->external_id, $data['kind'], $url);

        if (! $result['ok']) {
            return response()->json(['error' => 'Илгээж чадсангүй: '.($result['error'] ?? 'тодорхойгүй алдаа')], 422);
        }

        $label = ['image' => '[зураг]', 'audio' => '[дуу хоолой]', 'video' => '[видео]', 'file' => '[файл]'][$data['kind']];

        $message = SocialMessage::create([
            'social_conversation_id' => $conversation->id,
            'direction' => SocialMessage::DIR_OUT,
            'sender' => SocialMessage::SENDER_AGENT,
            'type' => $data['kind'],
            'attachments' => [['type' => $data['kind'], 'url' => $url]],
            'external_mid' => $result['mid'],
            'sent_by_user_id' => $request->user()?->id,
            'delivered_at' => now(),
        ]);

        $conversation->update(['last_message_text' => $label, 'last_message_at' => now()]);

        try {
            broadcast(new SocialMessageReceived($message));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Social broadcast failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['message' => [
            'id' => $message->id, 'direction' => $message->direction, 'sender' => $message->sender,
            'type' => $message->type, 'text' => null, 'attachments' => $message->attachments,
            'created_at' => $message->created_at?->toIso8601String(),
        ]]);
    }

    /** Харилцааны төлөв солих (bot / open / closed). */
    public function setStatus(SocialConversation $conversation, Request $request): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:bot,open,closed']);

        $update = ['status' => $data['status']];
        if ($data['status'] === SocialConversation::STATUS_BOT) {
            $update['awaiting_node_id'] = null; // бот руу буцахад хүлээлтийг цэвэрлэнэ
        }
        $conversation->update($update);

        return response()->json(['ok' => true, 'status' => $data['status']]);
    }

    /** Flow picker-т харагдах нэг бүхэлд илгээгддэг контент блокийн төрлүүд. */
    private const SENDABLE_NODE_TYPES = ['message', 'image', 'carousel', 'media', 'file'];

    /** Flow picker — идэвхтэй урсгалууд + тэдгээрийн доторх илгээх боломжтой блокууд. */
    public function flows(): JsonResponse
    {
        $typeLabels = ['message' => 'Мессеж', 'image' => 'Зураг', 'carousel' => 'Карусель', 'media' => 'Видео', 'file' => 'Файл'];

        $flows = SocialFlow::where('is_active', true)
            ->with(['nodes' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (SocialFlow $f) => [
                'id' => $f->id,
                'name' => $f->name,
                'icon' => $f->icon,
                'trigger_type' => $f->trigger_type,
                'blocks' => $f->nodes
                    ->whereIn('type', self::SENDABLE_NODE_TYPES)
                    ->map(fn (SocialFlowNode $n) => [
                        'id' => $n->id,
                        'type' => $n->type,
                        'label' => $n->title
                            ?: (trim((string) $n->body) !== '' ? mb_substr(trim((string) $n->body), 0, 40) : ($typeLabels[$n->type] ?? 'Блок')),
                    ])
                    ->values(),
            ]);

        return response()->json(['flows' => $flows]);
    }

    /** Оператор сонгосон flow-г (эхлэлээс нь) одоо байгаа харилцаа руу гараар илгээх. */
    public function sendFlow(SocialConversation $conversation, Request $request, SocialFlowRunner $runner): JsonResponse
    {
        $data = $request->validate(['flow_id' => 'required|integer|exists:social_flows,id']);

        $conversation->loadMissing(['account', 'contact']);
        if (! $conversation->account || ! $conversation->contact) {
            return response()->json(['error' => 'Харилцаа дутуу мэдээлэлтэй байна.'], 422);
        }

        $flow = SocialFlow::find($data['flow_id']);

        // 24ц цонх хаагдсан бол операторын гар flow-г HUMAN_AGENT tag-аар (7 хоног) илгээнэ.
        $tag = $conversation->windowOpen() ? null : 'HUMAN_AGENT';

        try {
            $runner->sendFlowToConversation($conversation, $flow, $tag);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Social sendFlow failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Flow илгээхэд алдаа гарлаа.'], 422);
        }

        return response()->json(['ok' => true]);
    }

    /** Оператор сонгосон НЭГ блокийг (мессеж/карусель/зураг…) дараагийн рүү үргэлжлүүлэхгүйгээр илгээх. */
    public function sendNode(SocialConversation $conversation, Request $request, SocialFlowRunner $runner): JsonResponse
    {
        $data = $request->validate(['node_id' => 'required|integer|exists:social_flow_nodes,id']);

        $conversation->loadMissing(['account', 'contact']);
        if (! $conversation->account || ! $conversation->contact) {
            return response()->json(['error' => 'Харилцаа дутуу мэдээлэлтэй байна.'], 422);
        }

        $node = SocialFlowNode::find($data['node_id']);
        if (! in_array($node->type, self::SENDABLE_NODE_TYPES, true)) {
            return response()->json(['error' => 'Энэ төрлийн блокийг ганцаар илгээх боломжгүй.'], 422);
        }

        $tag = $conversation->windowOpen() ? null : 'HUMAN_AGENT';

        try {
            $runner->sendNodeToConversation($conversation, $node, $tag);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Social sendNode failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Блок илгээхэд алдаа гарлаа.'], 422);
        }

        return response()->json(['ok' => true]);
    }

    /** Уншсан болгох. */
    public function markRead(SocialConversation $conversation): JsonResponse
    {
        $conversation->update(['unread_count' => 0]);

        return response()->json(['ok' => true]);
    }

    /** Чатыг бүрэн устгах (мессеж бүгд). */
    public function destroy(SocialConversation $conversation): JsonResponse
    {
        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['ok' => true]);
    }

    /** Үйлчлүүлэгчийн профайл + цуглуулсан мэдээлэл (баруун самбар). */
    public function contactInfo(SocialConversation $conversation): JsonResponse
    {
        $conversation->loadMissing(['contact', 'account']);
        $c = $conversation->contact;
        $attrs = $c?->attributes ?? [];

        return response()->json(['contact' => [
            'name' => $c?->displayName(),
            'username' => $c?->username,
            'avatar' => $c?->avatar,
            'channel' => $conversation->channel,
            'external_id' => $c?->external_id,
            'gender' => $c?->gender,
            'page_name' => $conversation->account?->page_name,
            'status' => $conversation->status,
            'first_seen' => $c?->created_at?->toIso8601String(),
            'last_interacted_at' => $c?->last_interacted_at?->toIso8601String(),
            'message_count' => $conversation->messages()->count(),
            // Оператор гараар оруулсан талбарууд
            'op_phone' => $attrs['_phone'] ?? null,
            'op_email' => $attrs['_email'] ?? null,
            'op_note' => $attrs['_note'] ?? null,
            // Бот цуглуулсан (_ угтвартайг хасна)
            'attributes' => collect($attrs)->reject(fn ($v, $k) => str_starts_with((string) $k, '_'))->all(),
            'tags' => $c?->tags ?? [],
        ]]);
    }

    /** Операторын засвар — нэр, утас, имэйл, тэмдэглэл, тэмдэг. */
    public function updateContact(SocialConversation $conversation, Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:120',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|string|max:120',
            'note' => 'nullable|string|max:2000',
            'gender' => 'sometimes|nullable|in:male,female',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:40',
        ]);

        $contact = $conversation->contact;
        if (! $contact) {
            return response()->json(['error' => 'Контакт олдсонгүй'], 404);
        }

        if (array_key_exists('name', $data) && ! empty($data['name'])) {
            $contact->name = $data['name'];
        }

        if (array_key_exists('gender', $data)) {
            $contact->gender = $data['gender'] ?: null; // '' / null → тодорхойгүй
        }

        $attrs = $contact->attributes ?? [];
        foreach (['phone' => '_phone', 'email' => '_email', 'note' => '_note'] as $field => $key) {
            if (array_key_exists($field, $data)) {
                $val = trim((string) ($data[$field] ?? ''));
                if ($val === '') {
                    unset($attrs[$key]);
                } else {
                    $attrs[$key] = $val;
                }
            }
        }
        $contact->attributes = $attrs;

        if (array_key_exists('tags', $data)) {
            $contact->tags = array_values(array_unique(array_filter($data['tags'] ?? [])));
        }

        $contact->save();

        return response()->json(['ok' => true]);
    }

    /** @return \Illuminate\Support\Collection<int, array<string, mixed>> */
    private function conversationList()
    {
        return SocialConversation::query()
            ->with(['contact', 'account'])
            ->orderByDesc('last_message_at')
            ->limit(100)
            ->get()
            ->map(fn (SocialConversation $c) => [
                'id' => $c->id,
                'channel' => $c->channel,
                'status' => $c->status,
                'name' => $c->contact?->displayName(),
                'avatar' => $c->contact?->avatar,
                'page_name' => $c->account?->page_name,
                'last_message_text' => $c->last_message_text,
                'last_message_at' => $c->last_message_at?->toIso8601String(),
                'unread_count' => $c->unread_count,
                'window_open' => $c->windowOpen(),
            ]);
    }
}
