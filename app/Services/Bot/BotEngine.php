<?php

namespace App\Services\Bot;

use App\Events\Chat\HandoffRequested;
use App\Models\Bot\BotButton;
use App\Models\Bot\BotFlow;
use App\Models\Bot\BotNode;
use App\Models\Chat\Conversation;
use App\Models\Chat\Handoff;
use App\Models\Chat\Message;
use App\Models\User;
use App\Services\Chat\ChatService;
use Illuminate\Support\Facades\DB;

class BotEngine
{
    public function __construct(
        protected ChatService $chat,
        protected BotDataResolver $resolver,
    ) {}

    /**
     * Send the welcome screen to the user's bot conversation.
     */
    public function sendWelcome(User $user, Conversation $conv): Message
    {
        $welcome = BotNode::query()->where('is_welcome', true)->whereNull('flow_id')->first();

        if (!$welcome) {
            return $this->chat->sendMessage(
                $conv,
                null,
                "Сайн байна уу 👋\nТанд хэрхэн туслах вэ?",
                senderType: Message::SENDER_BOT,
                type: Message::TYPE_TEXT,
            );
        }

        return $this->sendNode($user, $conv, $welcome);
    }

    /**
     * Send a bot node as a bot_card message (body + buttons in meta).
     */
    public function sendNode(User $user, Conversation $conv, BotNode $node): Message
    {
        $node->loadMissing('buttons');

        $data = $this->resolver->resolve($user, $node->data_source);
        $body = $this->resolver->apply($node->body, $data);

        $buttons = $node->buttons->map(fn (BotButton $b) => [
            'id'             => $b->id,
            'label'          => $b->label,
            'icon'           => $b->icon,
            'action'         => $b->action,
            'target_node_id' => $b->target_node_id,
            'target_flow_id' => $b->target_flow_id,
            'target_url'     => $b->target_url,
        ])->all();

        return $this->chat->sendMessage(
            $conv,
            null,
            $body,
            senderType: Message::SENDER_BOT,
            botNodeId: $node->id,
            meta: ['title' => $node->title, 'buttons' => $buttons],
            type: Message::TYPE_BOT_CARD,
        );
    }

    /**
     * User pressed a bot button. Echo their choice + send the resulting node.
     *
     * @return array{user_message: Message, bot_message: ?Message, handoff: ?Handoff}
     */
    public function handleButton(User $user, Conversation $conv, BotButton $button): array
    {
        // Echo user's tap as a regular user message.
        $userMessage = $this->chat->sendMessage(
            $conv,
            $user,
            $button->label,
            meta: ['from_button_id' => $button->id],
        );

        $botMessage = null;
        $handoff = null;

        switch ($button->action) {
            case BotButton::ACTION_NEXT_NODE:
                if ($button->target_node_id) {
                    $node = BotNode::find($button->target_node_id);
                    if ($node) {
                        $botMessage = $this->sendNode($user, $conv, $node);
                    }
                }
                break;

            case BotButton::ACTION_FLOW_START:
                if ($button->target_flow_id) {
                    $flow = BotFlow::with('entryNode')->find($button->target_flow_id);
                    if ($flow?->entryNode) {
                        $botMessage = $this->sendNode($user, $conv, $flow->entryNode);
                    }
                }
                break;

            case BotButton::ACTION_BACK:
                $welcome = BotNode::query()->where('is_welcome', true)->whereNull('flow_id')->first();
                if ($welcome) {
                    $botMessage = $this->sendNode($user, $conv, $welcome);
                }
                break;

            case BotButton::ACTION_HANDOFF:
                $support = $this->chat->findOrCreateSupportConversation($user);
                // Drop a system message into the support chat so admins see context.
                $this->chat->sendMessage(
                    $support,
                    null,
                    ($user->name ?? 'Хэрэглэгч') . ' админтай холбогдохыг хүсэв.',
                    senderType: Message::SENDER_SYSTEM,
                    type: Message::TYPE_SYSTEM,
                );
                $botMessage = $this->chat->sendMessage(
                    $conv,
                    null,
                    "Таны хүсэлтийг админд дамжууллаа. Хариу ирэхэд танд мэдэгдэх болно. 💬",
                    senderType: Message::SENDER_BOT,
                    type: Message::TYPE_TEXT,
                );
                break;

            case BotButton::ACTION_CLOSE:
                $botMessage = $this->chat->sendMessage(
                    $conv,
                    null,
                    "Танд баярлалаа. Дахин санал хэрэгтэй бол энд бичээрэй. 🙏",
                    senderType: Message::SENDER_BOT,
                    type: Message::TYPE_TEXT,
                );
                break;

            case BotButton::ACTION_URL:
                // No follow-up — the client opens the URL.
                break;
        }

        return [
            'user_message' => $userMessage,
            'bot_message'  => $botMessage,
            'handoff'      => $handoff,
        ];
    }

    public function requestHandoff(User $user, Conversation $botConv, ?string $reason = null): Handoff
    {
        return DB::transaction(function () use ($user, $botConv, $reason) {
            $handoff = Handoff::create([
                'bot_conversation_id' => $botConv->id,
                'user_id'             => $user->id,
                'reason'              => $reason,
                'status'              => Handoff::STATUS_PENDING,
            ]);

            broadcast(new HandoffRequested($handoff));

            return $handoff;
        });
    }
}
