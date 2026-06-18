<?php

namespace App\Services\Social;

use App\Events\Social\SocialMessageReceived;
use App\Jobs\Social\SocialFlowContinue;
use App\Models\Social\SocialAccount;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialFlow;
use App\Models\Social\SocialFlowButton;
use App\Models\Social\SocialFlowNode;
use App\Models\Social\SocialMessage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

/**
 * Social flow engine — олон төрлийн блокийг (message/image/question/action/condition/delay)
 * гүйцэтгэнэ. Хувийн хувьсагч ({{full_name}}) болон аналитик дэмжинэ.
 */
class SocialFlowRunner
{
    private const MAX_STEPS = 30;

    public function __construct(
        private readonly MetaGraphService $meta,
        private readonly PersonalizationResolver $personalize,
    ) {}

    // ─── Орох цэг ──────────────────────────────────────────────────────────────

    public function handleIncoming(
        SocialAccount $account,
        SocialConversation $conversation,
        SocialContact $contact,
        ?string $text,
        ?string $payload,
        bool $isNewConversation,
    ): void {
        // 0. Question хариу хүлээж байгаа бол хадгалаад үргэлжлүүлнэ.
        if ($conversation->awaiting_node_id && $payload === null && $text !== null) {
            $this->resumeFromQuestion($account, $conversation, $contact, $text);

            return;
        }

        // 1. Товч дарсан (quick reply / postback)
        if ($payload) {
            $this->handlePayload($account, $conversation, $contact, $payload);

            return;
        }

        // 2. Чөлөөт текст → keyword (эхлээд тодорхой блок, дараа нь урсгал)
        if ($text !== null) {
            $node = $this->matchKeywordNode($account, $text);
            if ($node) {
                $this->run($account, $conversation, $contact, $node);

                return;
            }
            $flow = $this->matchKeywordFlow($account, $text);
            if ($flow) {
                $this->startFlow($account, $conversation, $contact, $flow);

                return;
            }
        }

        // 3. Шинэ харилцаа → welcome
        if ($isNewConversation) {
            $welcome = $this->triggerFlow($account, SocialFlow::TRIGGER_WELCOME);
            if ($welcome) {
                $this->startFlow($account, $conversation, $contact, $welcome);

                return;
            }
        }

        // 4. default (fallback)
        $default = $this->triggerFlow($account, SocialFlow::TRIGGER_DEFAULT);
        if ($default) {
            $this->startFlow($account, $conversation, $contact, $default);
        }
    }

    /** Delay job-оос дуудагдана — тодорхой node-оос үргэлжлүүлнэ. */
    public function runNodeId(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, int $nodeId): void
    {
        $node = SocialFlowNode::find($nodeId);
        if ($node) {
            $this->run($account, $conversation, $contact, $node);
        }
    }

    // ─── Payload (товч) ────────────────────────────────────────────────────────

    private function handlePayload(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, string $payload): void
    {
        // Формат: "node:{id}:b:{btnId}" / "flow:{id}:b:{btnId}" / "handoff:b:{btnId}"
        if (preg_match('/:b:(\d+)$/', $payload, $m)) {
            SocialFlowButton::where('id', (int) $m[1])->increment('click_count');
            $payload = preg_replace('/:b:\d+$/', '', $payload);
        }

        // Messenger "Get Started" товч → welcome (байхгүй бол default) flow эхлүүлнэ.
        if ($payload === 'GET_STARTED') {
            $flow = $this->triggerFlow($account, SocialFlow::TRIGGER_WELCOME)
                ?: $this->triggerFlow($account, SocialFlow::TRIGGER_DEFAULT);
            if ($flow) {
                $this->startFlow($account, $conversation, $contact, $flow);
            }

            return;
        }
        if ($payload === 'handoff') {
            $this->handoff($account, $conversation, $contact);

            return;
        }
        // Instagram-д call товч дэмжигддэггүй тул postback болгосон — дарвал утасны дугаарыг текстээр харуулна.
        if (str_starts_with($payload, 'phone:')) {
            $phone = substr($payload, 6);
            $result = $this->meta->sendText($account, $contact->external_id, '📞 Утсаар холбогдох: '.$phone);
            $this->record($conversation, null, '📞 '.$phone, $result['mid'] ?? null, [], 'text');

            return;
        }
        if (str_starts_with($payload, 'node:')) {
            $node = SocialFlowNode::find((int) substr($payload, 5));
            if ($node) {
                $this->run($account, $conversation, $contact, $node);
            }

            return;
        }
        if (str_starts_with($payload, 'flow:')) {
            $flow = SocialFlow::find((int) substr($payload, 5));
            if ($flow) {
                $this->startFlow($account, $conversation, $contact, $flow);
            }
        }
    }

    private function startFlow(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlow $flow): void
    {
        $entry = $flow->entryNode ?: $flow->nodes()->orderBy('sort_order')->orderBy('id')->first();
        if ($entry) {
            $this->run($account, $conversation, $contact, $entry);
        }
    }

    /**
     * Коммент дээрээс flow эхлүүлэх: эхний node-ийг private reply (comment_id)-аар (текст + товч) илгээнэ.
     * Хариунаас ирэх messaging PSID (recipient_id)-аар contact/conversation үүсгэнэ — хэрэглэгч товч
     * дартал postback ирж flow энгийн журмаар (ProcessSocialEvent → handlePayload) үргэлжилнэ.
     */
    public function startFlowFromComment(SocialAccount $account, string $commentId, string $fromId, string $channel, SocialFlow $flow, ?int $startNodeId = null): void
    {
        // Тодорхой блок зааж өгсөн бол түүнээс, үгүй бол урсгалын эхнээс.
        $entry = $startNodeId
            ? SocialFlowNode::where('flow_id', $flow->id)->find($startNodeId)
            : ($flow->entryNode ?: $flow->nodes()->orderBy('sort_order')->orderBy('id')->first());
        if (! $entry) {
            return;
        }

        // Түр contact/conversation (PSID-г хариунаас аваад дараа залруулна).
        $contact = SocialContact::firstOrNew(['social_account_id' => $account->id, 'channel' => $channel, 'external_id' => $fromId]);
        $contact->last_interacted_at = now();
        $contact->save();

        $conversation = SocialConversation::firstOrNew(['social_contact_id' => $contact->id]);
        if (! $conversation->exists) {
            $conversation->social_account_id = $account->id;
            $conversation->channel = $channel;
            $conversation->status = SocialConversation::STATUS_BOT;
        }
        $conversation->save();

        // Эхний node-ийг төрлөөр нь private reply болгож бэлдэнэ.
        $recordText = '';
        $recordLabels = [];
        $recordType = 'text';
        $recordAtt = null;

        if ($entry->type === SocialFlowNode::TYPE_CAROUSEL) {
            // Карусель → generic template (картууд + товчнууд)
            $c = $this->carouselElements($entry, $conversation, $contact);
            if (empty($c['elements'])) {
                return;
            }
            $message = ['attachment' => ['type' => 'template', 'payload' => [
                'template_type' => 'generic', 'elements' => array_slice($c['elements'], 0, 10),
            ]]];
            $recordText = '[карусель]';
            $recordType = 'carousel';
            $recordAtt = $c['attachments'] ?: null;
        } else {
            // Мессеж (болон бусад) → текст + товч (button template)
            $p = $this->messageParts($entry, $conversation, $contact);
            $text = trim($p['body']) !== '' ? mb_substr($p['body'], 0, 640) : '👋';

            if (! empty($p['tpl'])) {
                $message = ['attachment' => ['type' => 'template', 'payload' => [
                    'template_type' => 'button', 'text' => $text, 'buttons' => $p['tpl'],
                ]]];
            } else {
                $message = ['text' => $text];
            }
            if (! empty($p['quick'])) {
                $message['quick_replies'] = collect($p['quick'])->take(13)->map(fn ($r) => [
                    'content_type' => 'text', 'title' => mb_substr($r['title'], 0, 20), 'payload' => $r['payload'],
                ])->values()->all();
            }
            $recordText = $p['body'];
            $recordLabels = $p['labels'];
            $recordType = (! empty($p['tpl']) || ! empty($p['quick'])) ? 'buttons' : 'text';
        }

        $result = $this->meta->sendPrivateReplyMessage($account, $commentId, $message);

        // Messaging PSID нь комментын from.id-аас өөр байж болзошгүй — recipient_id-аар залруулна.
        $psid = $result['recipient_id'] ?? null;
        if ($psid && (string) $psid !== (string) $contact->external_id) {
            $contact->update(['external_id' => (string) $psid]);
        }

        $this->record($conversation, $entry, $recordText, $result['mid'] ?? null, $recordLabels, $recordType, $recordAtt);
        // Дараагийн алхам нь хэрэглэгч товч дарж/хариулмагц (window нээгдэхэд) үргэлжилнэ.
    }

    /**
     * Message node-оос текст + товчнуудыг (button template + quick reply) бэлдэнэ.
     * execMessage болон startFlowFromComment хоёр хуваалцана.
     *
     * @return array{body:string, tpl:array<int,array<string,mixed>>, quick:array<int,array{title:string,payload:string}>, labels:array<int,string>}
     */
    private function messageParts(SocialFlowNode $node, SocialConversation $conversation, SocialContact $contact): array
    {
        $body = $this->personalize->apply($node->body, $contact);
        $buttons = $node->buttons()->get();
        $labels = $buttons->pluck('label')->all();

        // Quick reply нь зөвхөн навигаци (next_node / flow_start / handoff)-д тохирно.
        $navActions = [SocialFlowButton::ACTION_NEXT_NODE, SocialFlowButton::ACTION_FLOW_START, SocialFlowButton::ACTION_HANDOFF];
        $tpl = [];
        $quick = [];
        foreach ($buttons as $b) {
            $label = mb_substr((string) $b->label, 0, 20);
            if ($b->is_quick_reply && in_array($b->action, $navActions, true)) {
                $quick[] = ['title' => $b->label, 'payload' => $this->payloadFor($b)];

                continue;
            }
            if ($b->action === SocialFlowButton::ACTION_URL && $b->url) {
                $tpl[] = ['type' => 'web_url', 'title' => $label, 'url' => $b->url];
            } elseif ($b->action === SocialFlowButton::ACTION_WEB_FORM && $b->target_form_id) {
                $tpl[] = ['type' => 'web_url', 'title' => $label, 'url' => $this->formUrl((int) $b->target_form_id, $conversation, $contact)];
            } elseif ($b->action === SocialFlowButton::ACTION_CALL && $b->phone) {
                $tpl[] = ['type' => 'phone_number', 'title' => $label, 'payload' => $b->phone];
            } else {
                $tpl[] = ['type' => 'postback', 'title' => $label, 'payload' => $this->payloadFor($b)];
            }
        }

        return ['body' => $body, 'tpl' => array_slice($tpl, 0, 3), 'quick' => $quick, 'labels' => $labels];
    }

    private function resumeFromQuestion(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, string $text): void
    {
        $qnode = SocialFlowNode::find($conversation->awaiting_node_id);
        $conversation->update(['awaiting_node_id' => null]);

        if ($qnode && $qnode->save_field) {
            $attrs = $contact->attributes ?? [];
            $attrs[$qnode->save_field] = $text;
            $contact->update(['attributes' => $attrs]);
        }

        if ($qnode && $qnode->next_node_id) {
            $next = SocialFlowNode::find($qnode->next_node_id);
            if ($next) {
                $this->run($account, $conversation, $contact, $next);
            }
        }
    }

    // ─── Гүйцэтгэх гол давталт ──────────────────────────────────────────────────

    private function run(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): void
    {
        $current = $node;
        $steps = 0;

        while ($current && $steps++ < self::MAX_STEPS) {
            $current = $this->execute($account, $conversation, $contact, $current);
        }

        if ($steps >= self::MAX_STEPS) {
            Log::warning('Social flow max steps reached', ['conversation' => $conversation->id]);
        }
    }

    /** Нэг node-ийг гүйцэтгээд дараагийн node-ийг буцаана (null = зогс). */
    private function execute(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        return match ($node->type) {
            SocialFlowNode::TYPE_IMAGE => $this->execImage($account, $conversation, $contact, $node),
            SocialFlowNode::TYPE_QUESTION => $this->execQuestion($account, $conversation, $contact, $node),
            SocialFlowNode::TYPE_ACTION => $this->execAction($account, $conversation, $contact, $node),
            SocialFlowNode::TYPE_CONDITION => $this->execCondition($contact, $node),
            SocialFlowNode::TYPE_DELAY => $this->execDelay($account, $conversation, $contact, $node),
            SocialFlowNode::TYPE_CAROUSEL => $this->execCarousel($account, $conversation, $contact, $node),
            SocialFlowNode::TYPE_MEDIA => $this->execAttachmentNode($account, $conversation, $contact, $node, 'video', '[видео]'),
            SocialFlowNode::TYPE_FILE => $this->execAttachmentNode($account, $conversation, $contact, $node, 'file', '[файл]'),
            SocialFlowNode::TYPE_TYPING => $this->execTyping($account, $conversation, $contact, $node),
            default => $this->execMessage($account, $conversation, $contact, $node),
        };
    }

    private function execAttachmentNode(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node, string $type, string $label): ?SocialFlowNode
    {
        if (! empty($node->image_url)) {
            $result = $this->meta->sendAttachment($account, $contact->external_id, $type, $node->image_url);
            $this->record($conversation, $node, $label, $result['mid'] ?? null, [], $type, [['type' => $type, 'url' => $node->image_url]]);
        }

        return $node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null;
    }

    private function execTyping(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        $this->meta->sendTyping($account, $contact->external_id);

        return $node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null;
    }

    private function execCarousel(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        $c = $this->carouselElements($node, $conversation, $contact);

        if (empty($c['elements'])) {
            return $node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null;
        }

        $result = $this->meta->sendGenericTemplate($account, $contact->external_id, array_slice($c['elements'], 0, 10));
        $this->record($conversation, $node, '[карусель]', $result['mid'] ?? null, [], 'carousel', $c['attachments'] ?: null);

        // Товчтой бол хүлээнэ; үгүй бол үргэлжилнэ.
        return $c['hasButtons'] ? null : ($node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null);
    }

    /**
     * Карусель node-оос generic template element-үүд + inbox attachment-уудыг бэлдэнэ.
     * execCarousel болон startFlowFromComment хоёр хуваалцана.
     *
     * @return array{elements:array<int,array<string,mixed>>, hasButtons:bool, attachments:array<int,array<string,mixed>>}
     */
    private function carouselElements(SocialFlowNode $node, SocialConversation $conversation, SocialContact $contact): array
    {
        $cards = $node->cards ?? [];
        $elements = [];
        // Instagram нь generic template-д phone_number (call) товч дэмждэггүй — алгасна.
        $isInstagram = $conversation->channel === 'instagram';

        foreach ($cards as $card) {
            $buttons = [];
            foreach ($card['buttons'] ?? [] as $b) {
                if (($b['action'] ?? '') === 'call' && ! empty($b['phone'])) {
                    if ($isInstagram) {
                        // IG нь phone_number товч дэмждэггүй — postback болгоно (товч харагдана, дарвал дугаар текстээр).
                        $buttons[] = ['type' => 'postback', 'title' => mb_substr($b['label'] ?? 'Залгах', 0, 30), 'payload' => 'phone:'.$b['phone']];
                        continue;
                    }
                    $buttons[] = ['type' => 'phone_number', 'title' => mb_substr($b['label'] ?? 'Залгах', 0, 30), 'payload' => $b['phone']];
                } elseif (($b['action'] ?? '') === 'web_form' && ! empty($b['target_form_id'])) {
                    $buttons[] = ['type' => 'web_url', 'title' => mb_substr($b['label'] ?? 'Бөглөх', 0, 30), 'url' => $this->formUrl((int) $b['target_form_id'], $conversation, $contact)];
                } elseif (($b['action'] ?? '') === 'url' && ! empty($b['url'])) {
                    $buttons[] = ['type' => 'web_url', 'title' => mb_substr($b['label'] ?? 'Үзэх', 0, 30), 'url' => $b['url']];
                } else {
                    $payload = match ($b['action'] ?? '') {
                        'next_node' => 'node:'.($b['target_node_id'] ?? ''),
                        'flow_start' => 'flow:'.($b['target_flow_id'] ?? ''),
                        'handoff' => 'handoff',
                        default => 'noop',
                    };
                    $buttons[] = ['type' => 'postback', 'title' => mb_substr($b['label'] ?? 'Сонгох', 0, 30), 'payload' => $payload];
                }
            }

            $el = ['title' => mb_substr($this->personalize->apply($card['title'] ?? 'Карт', $contact) ?: 'Карт', 0, 80)];
            if (! empty($card['subtitle'])) {
                $el['subtitle'] = mb_substr($this->personalize->apply($card['subtitle'], $contact), 0, 80);
            }
            if (! empty($card['image'])) {
                $el['image_url'] = $card['image'];
            }
            if (! empty($buttons)) {
                $el['buttons'] = array_slice($buttons, 0, 3);
            }

            // Зөвхөн гарчигтай (дутуу) картыг алгасна — Meta бүрэн бус картыг татгалздаг.
            if (! isset($el['subtitle']) && ! isset($el['image_url']) && empty($el['buttons'])) {
                continue;
            }

            $elements[] = $el;
        }

        // Жинхэнэ үлдсэн товчоор тооцно (IG-д call товч хасагдсан байж болно).
        $hasButtons = collect($elements)->contains(fn ($e) => ! empty($e['buttons']));

        $attachments = collect($cards)->map(fn ($c) => [
            'type' => 'card',
            'title' => $c['title'] ?? null,
            'subtitle' => $c['subtitle'] ?? null,
            'image' => $c['image'] ?? null,
            'buttons' => collect($c['buttons'] ?? [])->map(fn ($b) => ['label' => $b['label'] ?? ''])->values()->all(),
        ])->values()->all();

        return ['elements' => $elements, 'hasButtons' => $hasButtons, 'attachments' => $attachments];
    }

    private function execMessage(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        // Зураг (хэрэв байвал)
        if (! empty($node->image_url)) {
            $this->meta->sendImage($account, $contact->external_id, $node->image_url);
            $this->record($conversation, $node, '[зураг]', null, [], 'image', [['type' => 'image', 'url' => $node->image_url]]);
        }

        $p = $this->messageParts($node, $conversation, $contact);
        $body = $p['body'];
        $tpl = $p['tpl'];
        $quick = $p['quick'];
        $labels = $p['labels'];

        if (! empty($tpl)) {
            if ($conversation->channel === 'instagram') {
                // Instagram нь button template дэмждэггүй — нэг картын generic template
                // болгоно (phone товчийг postback болгоно).
                $igButtons = array_map(function ($b) {
                    if (($b['type'] ?? '') === 'phone_number') {
                        return ['type' => 'postback', 'title' => $b['title'] ?? 'Залгах', 'payload' => 'phone:'.($b['payload'] ?? '')];
                    }

                    return $b;
                }, $tpl);
                $el = ['title' => mb_substr(trim($body) !== '' ? $body : 'Сонгоно уу 👇', 0, 80), 'buttons' => array_slice($igButtons, 0, 3)];
                if (mb_strlen(trim($body)) > 80) {
                    $el['subtitle'] = mb_substr(trim($body), 80, 80);
                }
                $result = $this->meta->sendGenericTemplate($account, $contact->external_id, [$el]);
            } else {
                $text = trim($body) !== '' ? $body : '⠀'; // button template-д текст заавал
                $result = $this->meta->sendButtonTemplate($account, $contact->external_id, $text, $tpl, $quick);
            }
            $this->record($conversation, $node, $body, $result['mid'] ?? null, $labels, 'buttons');
        } elseif (! empty($quick)) {
            $text = trim($body) !== '' ? $body : 'Сонгоно уу 👇';
            $result = $this->meta->sendQuickReplies($account, $contact->external_id, $text, $quick);
            $this->record($conversation, $node, $body, $result['mid'] ?? null, $labels, 'buttons');
        } elseif (trim($body) !== '') {
            $result = $this->meta->sendText($account, $contact->external_id, $body);
            $this->record($conversation, $node, $body, $result['mid'] ?? null, [], 'text');
        }

        // Навигацийн товч (чип эсвэл postband товч) байвал хэрэглэгчийн сонголтыг хүлээнэ.
        $waits = ! empty($quick) || collect($tpl)->contains(fn ($b) => ($b['type'] ?? '') === 'postback');
        if ($waits) {
            return null;
        }

        return $node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null;
    }

    private function execImage(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        if (! empty($node->image_url)) {
            $this->meta->sendImage($account, $contact->external_id, $node->image_url);
            $this->record($conversation, $node, '[зураг]', null, [], 'image', [['type' => 'image', 'url' => $node->image_url]]);
        }

        return $node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null;
    }

    private function execQuestion(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        $body = $this->personalize->apply($node->body, $contact);
        $result = $this->meta->sendText($account, $contact->external_id, $body);
        $this->record($conversation, $node, $body, $result['mid'] ?? null, [], 'text');

        // Хэрэглэгчийн хариуг хүлээнэ.
        $conversation->update(['awaiting_node_id' => $node->id]);

        return null;
    }

    private function execAction(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        switch ($node->action_type) {
            case 'set_field':
                if ($node->action_field) {
                    $attrs = $contact->attributes ?? [];
                    $attrs[$node->action_field] = $node->action_value;
                    $contact->update(['attributes' => $attrs]);
                }
                break;
            case 'add_tag':
                if ($node->action_value) {
                    $tags = $contact->tags ?? [];
                    if (! in_array($node->action_value, $tags, true)) {
                        $tags[] = $node->action_value;
                        $contact->update(['tags' => $tags]);
                    }
                }
                break;
            case 'remove_tag':
                $tags = array_values(array_filter($contact->tags ?? [], fn ($t) => $t !== $node->action_value));
                $contact->update(['tags' => $tags]);
                break;
            case 'mark_open':
                $conversation->update(['status' => SocialConversation::STATUS_OPEN, 'unread_count' => ($conversation->unread_count ?? 0) + 1]);
                break;
            case 'start_flow':
                if ($node->action_flow_id) {
                    $flow = SocialFlow::find($node->action_flow_id);
                    if ($flow) {
                        $entry = $flow->entryNode ?: $flow->nodes()->orderBy('sort_order')->first();

                        return $entry; // дараагийн flow руу үсэрнэ
                    }
                }
                break;
        }

        return $node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null;
    }

    private function execCondition(SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        $pass = match ($node->condition_type) {
            'has_tag' => in_array($node->condition_value, $contact->tags ?? [], true),
            'field_equals' => ($contact->attributes[$node->condition_field] ?? null) == $node->condition_value,
            'field_contains' => str_contains(mb_strtolower((string) ($contact->attributes[$node->condition_field] ?? '')), mb_strtolower((string) $node->condition_value)),
            default => false,
        };

        $targetId = $pass ? $node->yes_node_id : $node->no_node_id;

        return $targetId ? SocialFlowNode::find($targetId) : null;
    }

    private function execDelay(SocialAccount $account, SocialConversation $conversation, SocialContact $contact, SocialFlowNode $node): ?SocialFlowNode
    {
        if ($node->next_node_id && $node->delay_seconds) {
            SocialFlowContinue::dispatch($account->id, $conversation->id, $contact->id, $node->next_node_id)
                ->delay(now()->addSeconds($node->delay_seconds));

            return null; // queue-аар үргэлжилнэ
        }

        return $node->next_node_id ? SocialFlowNode::find($node->next_node_id) : null;
    }

    // ─── Handoff ────────────────────────────────────────────────────────────────

    private function handoff(SocialAccount $account, SocialConversation $conversation, SocialContact $contact): void
    {
        $text = 'Таны хүсэлтийг операторт дамжууллаа. Удахгүй хариу өгөх болно. 💬';
        $result = $this->meta->sendText($account, $contact->external_id, $text);
        $this->record($conversation, null, $text, $result['mid'] ?? null, [], 'text');

        $conversation->update([
            'status' => SocialConversation::STATUS_OPEN,
            'unread_count' => ($conversation->unread_count ?? 0) + 1,
        ]);
    }

    // ─── Гарах мессеж бичих + аналитик + broadcast ──────────────────────────────

    private function record(SocialConversation $conversation, ?SocialFlowNode $node, string $text, ?string $mid, array $buttonLabels, string $type, ?array $attachments = null): void
    {
        $message = SocialMessage::create([
            'social_conversation_id' => $conversation->id,
            'flow_node_id' => $node?->id,
            'direction' => SocialMessage::DIR_OUT,
            'sender' => SocialMessage::SENDER_BOT,
            'type' => $type,
            'text' => $text,
            'attachments' => $attachments ?? (empty($buttonLabels) ? null : ['quick_replies' => $buttonLabels]),
            'external_mid' => $mid,
            'delivered_at' => now(),
        ]);

        if ($node) {
            $node->increment('sent_count');
        }

        // Placeholder ([карусель]/[зураг]…) бол preview-г дарж бичихгүй — сүүлийн утгатай текстийг үлдээнэ.
        $update = ['last_message_at' => now()];
        if (! preg_match('/^\[.*\]$/u', trim($text))) {
            $update['last_message_text'] = mb_substr($text, 0, 1000);
        }
        $conversation->update($update);

        try {
            broadcast(new SocialMessageReceived($message));
        } catch (\Throwable $e) {
            Log::warning('Social broadcast failed', ['error' => $e->getMessage()]);
        }
    }

    private function formUrl(int $formId, SocialConversation $conversation, SocialContact $contact): string
    {
        $base = rtrim((string) config('app.url'), '/');

        return "{$base}/f/{$formId}?c={$contact->id}&conv={$conversation->id}&t=".\App\Models\Social\SocialForm::token($formId, $contact->id);
    }

    private function payloadFor(SocialFlowButton $button): string
    {
        $base = match ($button->action) {
            SocialFlowButton::ACTION_NEXT_NODE => 'node:'.$button->target_node_id,
            SocialFlowButton::ACTION_FLOW_START => 'flow:'.$button->target_flow_id,
            SocialFlowButton::ACTION_HANDOFF => 'handoff',
            default => 'noop',
        };

        return $base.':b:'.$button->id;
    }

    // ─── Flow хайх ───────────────────────────────────────────────────────────────

    private function matchKeywordFlow(SocialAccount $account, string $text): ?SocialFlow
    {
        $needle = mb_strtolower(trim($text));

        $flows = SocialFlow::query()
            ->where('is_active', true)
            ->where('trigger_type', SocialFlow::TRIGGER_KEYWORD)
            ->where(fn (Builder $q) => $this->accountScope($q, $account))
            ->orderBy('sort_order')
            ->get();

        foreach ($flows as $flow) {
            foreach ($flow->keywords ?? [] as $kw) {
                $kw = mb_strtolower(trim((string) $kw));
                if ($kw !== '' && str_contains($needle, $kw)) {
                    return $flow;
                }
            }
        }

        return null;
    }

    /**
     * Чөлөөт текстийг node-уудын түлхүүр үгстэй тааруулна — таарвал тэр блокийг шууд ажиллуулна.
     * Жишээ: "металл аппарат хийдэг үү" → "металл" түлхүүртэй node руу шууд.
     */
    private function matchKeywordNode(SocialAccount $account, string $text): ?SocialFlowNode
    {
        $needle = mb_strtolower(trim($text));
        if ($needle === '') {
            return null;
        }

        $flowIds = SocialFlow::query()
            ->where('is_active', true)
            ->where(fn (Builder $q) => $this->accountScope($q, $account))
            ->pluck('id');

        if ($flowIds->isEmpty()) {
            return null;
        }

        $nodes = SocialFlowNode::whereIn('flow_id', $flowIds)
            ->whereNotNull('keywords')
            ->orderBy('id')
            ->get();

        $best = null;
        $bestLen = 0;
        foreach ($nodes as $node) {
            foreach ($node->keywords ?? [] as $kw) {
                $kw = mb_strtolower(trim((string) $kw));
                // Хамгийн урт таарсан түлхүүр үгийг сонгоно (илүү тодорхой).
                if ($kw !== '' && mb_strlen($kw) > $bestLen && str_contains($needle, $kw)) {
                    $best = $node;
                    $bestLen = mb_strlen($kw);
                }
            }
        }

        return $best;
    }

    private function triggerFlow(SocialAccount $account, string $trigger): ?SocialFlow
    {
        return SocialFlow::query()
            ->where('is_active', true)
            ->where('trigger_type', $trigger)
            ->where(fn (Builder $q) => $this->accountScope($q, $account))
            ->with('entryNode')
            ->orderBy('sort_order')
            ->first();
    }

    private function accountScope(Builder $q, SocialAccount $account): void
    {
        $q->whereNull('social_account_id')->orWhere('social_account_id', $account->id);
    }

    /**
     * Persistent menu / ice breaker-т ашиглах үндсэн навигацийг welcome (эсвэл default)
     * flow-ийн эхлэх node-ийн товчнуудаас үүсгэнэ.
     *
     * @return array<int, array{type:string,title:string,payload?:string,url?:string}>
     */
    public function buildMenuItems(SocialAccount $account): array
    {
        $flow = $this->triggerFlow($account, SocialFlow::TRIGGER_WELCOME)
            ?: $this->triggerFlow($account, SocialFlow::TRIGGER_DEFAULT);
        if (! $flow) {
            return [];
        }

        $entry = $flow->entryNode ?: $flow->nodes()->orderBy('sort_order')->orderBy('id')->first();
        if (! $entry) {
            return [];
        }

        $items = [];
        foreach ($entry->buttons()->orderBy('sort_order')->get() as $b) {
            if ($b->action === SocialFlowButton::ACTION_CALL && $b->phone) {
                $phone = str_starts_with($b->phone, '+') ? $b->phone : '+976'.ltrim($b->phone, '0');
                $items[] = ['type' => 'phone_number', 'title' => $b->label, 'payload' => $phone];
            } elseif ($b->action === SocialFlowButton::ACTION_URL && $b->url) {
                $items[] = ['type' => 'web_url', 'title' => $b->label, 'url' => $b->url];
            } elseif ($b->action === SocialFlowButton::ACTION_NEXT_NODE && $b->target_node_id) {
                $items[] = ['type' => 'postback', 'title' => $b->label, 'payload' => 'node:'.$b->target_node_id];
            } elseif ($b->action === SocialFlowButton::ACTION_FLOW_START && $b->target_flow_id) {
                $items[] = ['type' => 'postback', 'title' => $b->label, 'payload' => 'flow:'.$b->target_flow_id];
            }
        }

        return $items;
    }
}
