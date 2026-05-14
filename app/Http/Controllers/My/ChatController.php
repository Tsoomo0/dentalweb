<?php

namespace App\Http\Controllers\My;

use App\Events\Chat\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\Bot\BotButton;
use App\Models\Chat\Conversation;
use App\Models\Chat\Message;
use App\Models\Chat\Participant;
use App\Models\HR\Employee;
use App\Models\User;
use App\Services\Bot\BotEngine;
use App\Services\Chat\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ChatController extends Controller
{
    public function __construct(
        protected ChatService $chat,
        protected BotEngine $bot,
    ) {}

    /**
     * Resolve the underlying User for the request — supports web auth (User)
     * and the separate doctor guard (Doctor → Employee → User).
     */
    protected function currentUser(): User
    {
        // Web-guard user (HR ажилтан, админ г.м.) — User төрлийнх.
        if (Auth::guard('web')->check()) {
            $u = Auth::guard('web')->user();
            if ($u instanceof User) return $u;
        }

        // Doctor-guard — Doctor → Employee.user_id-ээр Userруу resolve.
        if (Auth::guard('doctor')->check()) {
            $doctor = Auth::guard('doctor')->user();
            $employeeId = $doctor?->employee_id;
            if ($employeeId) {
                $employee = Employee::find($employeeId);
                if ($employee?->user_id) {
                    $u = User::find($employee->user_id);
                    if ($u) return $u;
                }
            }
        }

        abort(403, 'Чат ашиглахын тулд хэрэглэгчийн бүртгэлтэй байх шаардлагатай.');
    }

    /**
     * Mobile chat home page. Lists conversations + ensures bot conversation exists.
     */
    public function index(): InertiaResponse
    {
        $user = $this->currentUser();

        // Ensure bot conversation exists for this user.
        $this->chat->findOrCreateBotForUser($user);

        return Inertia::render('my/Chat/Index', [
            'currentUserId' => $user->id,
            'isStaff'       => $user->isStaff(),
            'initialConversations' => $this->fetchConversationsData($user),
        ]);
    }

    /** Public wrapper for cross-controller use. */
    public function preloadConversations($user): array
    {
        return $this->fetchConversationsData($user);
    }

    /**
     * Shared loader so the same payload can be returned by both the
     * Inertia page (pre-render) and the AJAX list endpoint.
     */
    protected function fetchConversationsData($user): array
    {
        $conversations = Conversation::query()
            ->forUser($user->id)
            ->with([
                'lastMessage:id,conversation_id,body,type,sender_id,sender_type,created_at',
                'lastMessage.sender:id,name',
                'activeParticipants.user:id,name,role_id',
                'activeParticipants.user.role:id,name',
                'activeParticipants.user.employee:id,user_id,photo,last_name,first_name',
            ])
            ->orderByDesc(DB::raw('COALESCE(last_message_at, created_at)'))
            ->get();

        return $conversations->map(function (Conversation $c) use ($user) {
            [$title, $photo, $otherUserId] = $this->resolveDisplay($c, $user);
            $myPivot = $c->activeParticipants->firstWhere('user_id', $user->id);
            $otherOnline = $otherUserId
                ? \Illuminate\Support\Facades\Cache::has("chat-online:{$otherUserId}")
                : false;
            return [
                'id'                => $c->id,
                'type'              => $c->type,
                'title'             => $title,
                'avatar'            => $c->avatar,
                'photo'             => $photo,
                'other_user_id'     => $otherUserId,
                'other_online'      => $otherOnline,
                'last_message'      => $c->lastMessage ? [
                    'id'          => $c->lastMessage->id,
                    'body'        => $c->lastMessage->body,
                    'type'        => $c->lastMessage->type,
                    'sender_id'   => $c->lastMessage->sender_id,
                    'sender_type' => $c->lastMessage->sender_type,
                    'sender_name' => $c->lastMessage->sender?->name,
                    'created_at'  => $c->lastMessage->created_at?->toIso8601String(),
                ] : null,
                'last_message_at'   => $c->last_message_at?->toIso8601String(),
                'unread_count'      => $this->chat->unreadCount($c, $user),
                'is_pinned'         => (bool) ($myPivot?->is_pinned),
                'muted'             => $myPivot && $myPivot->muted_until && $myPivot->muted_until->isFuture(),
                'participants_count' => $c->activeParticipants->count(),
                'is_support'        => is_array($c->meta) && isset($c->meta['support_for_user_id']),
            ];
        })->all();
    }

    /**
     * Soft-delete a single message (sender or admin only).
     */
    public function destroyMessage(Message $message): JsonResponse
    {
        $user = $this->currentUser();
        $isOwner = $message->sender_id === $user->id;
        $isAdmin = $user->isAdmin();
        if (!$isOwner && !$isAdmin) {
            abort(403, 'Энэ мессежийг устгах эрх алга.');
        }
        $message->delete();
        broadcast(new \App\Events\Chat\ConversationUpdated(
            $message->conversation_id,
            $this->chat->participantUserIds($message->conversation),
            ['message_deleted_id' => $message->id]
        ));
        return response()->json(['ok' => true]);
    }

    /**
     * Delete (soft) the whole conversation for the current user — leaves the participant.
     * If admin requests, the conversation is fully removed for everyone.
     */
    public function destroyConversation(Conversation $conversation, Request $request): JsonResponse
    {
        $user = $this->currentUser();
        $forEveryone = (bool) $request->boolean('for_everyone');

        $isMember = $conversation->participants()
            ->where('user_id', $user->id)->whereNull('left_at')->exists();
        if (!$isMember) abort(403);

        if ($forEveryone) {
            if (!$user->isAdmin()) abort(403, 'Бүх хүний хувьд устгах эрх зөвхөн админд бий.');
            $conversation->delete();
        } else {
            // Just leave the conversation for this user — keeps history for others.
            $conversation->participants()
                ->where('user_id', $user->id)->update(['left_at' => now()]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Conversation list with last message + unread count.
     */
    public function listConversations(): JsonResponse
    {
        $user = $this->currentUser();
        return response()->json(['conversations' => $this->fetchConversationsData($user)]);
    }

    /**
     * Compute display title + photo for a conversation based on the viewing user.
     *
     * @return array{0:string,1:?string,2:?int}  [title, photoUrl, otherUserId]
     */
    protected function resolveDisplay(Conversation $c, $viewer): array
    {
        if ($c->type === Conversation::TYPE_BOT) {
            return ['HR Туслах', null, null];
        }

        // Support group (handoff) — special display rules.
        $supportFor = is_array($c->meta) ? ($c->meta['support_for_user_id'] ?? null) : null;
        if ($c->type === Conversation::TYPE_GROUP && $supportFor) {
            if ($viewer->id === (int) $supportFor) {
                // Employee viewing: show the admin who is helping (latest admin sender, or first admin).
                $adminParticipant = $c->activeParticipants
                    ->first(fn ($p) => $p->user && $p->user->role?->name === 'admin');

                // Prefer the admin who sent the most recent message, if any.
                $lastAdminMsg = \App\Models\Chat\Message::query()
                    ->where('conversation_id', $c->id)
                    ->where('sender_type', 'user')
                    ->whereHas('sender.role', fn ($q) => $q->where('name', 'admin'))
                    ->with(['sender:id,name', 'sender.employee:id,user_id,photo'])
                    ->latest('id')
                    ->first();

                $adminUser = $lastAdminMsg?->sender ?? $adminParticipant?->user;
                $photo = $this->userPhoto($adminUser);
                return [$adminUser?->name ?? 'HR баг', $photo, $adminUser?->id];
            }

            // Admin viewing: show the employee.
            $employeeUser = $c->activeParticipants
                ->firstWhere('user_id', (int) $supportFor)?->user;
            return [$employeeUser?->name ?? 'Хэрэглэгч', $this->userPhoto($employeeUser), $employeeUser?->id];
        }

        if ($c->type === Conversation::TYPE_DIRECT) {
            $other = $c->activeParticipants->where('user_id', '!=', $viewer->id)->first()?->user;
            return [$other?->name ?? 'Чат', $this->userPhoto($other), $other?->id];
        }

        // Regular group
        return [$c->name ?? 'Группын чат', null, null];
    }

    protected function userPhoto($user): ?string
    {
        if (!$user) return null;
        $employee = $user->relationLoaded('employee') ? $user->employee : null;
        if ($employee && $employee->photo) {
            return asset('storage/' . $employee->photo);
        }
        return null;
    }

    /**
     * Get a conversation + paginated messages.
     */
    public function show(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorizeMember($conversation);

        $user = $this->currentUser();
        $cursor = (int) $request->query('before_id', 0);
        $limit = min(50, max(10, (int) $request->query('limit', 30)));

        $messagesQuery = Message::query()
            ->where('conversation_id', $conversation->id)
            ->with([
                'sender:id,name',
                'attachments',
                'replyTo:id,body,sender_id,type',
                'replyTo.sender:id,name',
            ])
            ->orderByDesc('id')
            ->limit($limit);

        if ($cursor > 0) {
            $messagesQuery->where('id', '<', $cursor);
        }

        $messages = $messagesQuery->get()->reverse()->values();

        $conversation->load(['activeParticipants.user:id,name']);

        return response()->json([
            'conversation' => [
                'id'        => $conversation->id,
                'type'      => $conversation->type,
                'name'      => $conversation->name,
                'avatar'    => $conversation->avatar,
                'created_by' => $conversation->created_by,
            ],
            'participants' => $conversation->activeParticipants->map(fn (Participant $p) => [
                'user_id' => $p->user_id,
                'name'    => $p->user?->name,
                'role'    => $p->role,
                'last_read_at' => $p->last_read_at?->toIso8601String(),
            ]),
            'messages' => $messages->map(fn (Message $m) => $this->serializeMessage($m)),
            'has_more' => $messages->count() >= $limit,
        ]);
    }

    public function store(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorizeMember($conversation);

        $data = $request->validate([
            'body'        => 'nullable|string|max:5000',
            'reply_to_id' => 'nullable|integer|exists:chat_messages,id',
            'files.*'     => 'file|max:20480', // 20MB
        ]);

        $files = $request->file('files', []);

        $message = $this->chat->sendMessage(
            $conversation,
            $this->currentUser(),
            $data['body'] ?? null,
            files: $files,
            replyToId: $data['reply_to_id'] ?? null,
        );

        // If it's a bot conversation, no auto-reply for plain text yet — Phase 2 will add it.
        return response()->json(['message' => $this->serializeMessage($message)]);
    }

    public function markRead(Conversation $conversation): JsonResponse
    {
        $this->authorizeMember($conversation);
        $this->chat->markRead($conversation, $this->currentUser());
        return response()->json(['ok' => true]);
    }

    public function typing(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorizeMember($conversation);
        $user = $this->currentUser();
        broadcast(new UserTyping(
            $conversation->id,
            $user->id,
            $user->name,
            (bool) $request->input('is_typing', true),
        ))->toOthers();
        return response()->json(['ok' => true]);
    }

    /**
     * Create a group conversation. Only staff (admin/HR) can create groups.
     */
    public function createGroup(Request $request): JsonResponse
    {
        $user = $this->currentUser();
        if (!$user->isStaff()) {
            abort(403, 'Группын чат үүсгэх эрх алга.');
        }

        $data = $request->validate([
            'name'       => 'required|string|max:120',
            'user_ids'   => 'required|array|min:1',
            'user_ids.*' => 'integer|exists:users,id',
            'avatar'     => 'nullable|string',
        ]);

        $conv = $this->chat->createGroup(
            $user,
            $data['name'],
            $data['user_ids'],
            $data['avatar'] ?? null,
        );

        return response()->json(['conversation_id' => $conv->id]);
    }

    /**
     * Heartbeat — marks the user as currently online. Cache TTL = 90 seconds.
     * Frontend pings this every ~30 seconds while the chat page is open.
     */
    public function heartbeat(): JsonResponse
    {
        $user = $this->currentUser();
        \Illuminate\Support\Facades\Cache::put("chat-online:{$user->id}", now()->toIso8601String(), now()->addSeconds(90));
        return response()->json(['ok' => true]);
    }

    /**
     * Staff list (employees with linked user accounts) for new-chat picker.
     */
    public function listStaff(Request $request): JsonResponse
    {
        $search = (string) $request->query('q', '');
        $currentUserId = $this->currentUser()->id;

        $employees = Employee::query()
            ->whereNotNull('user_id')
            ->where('user_id', '!=', $currentUserId)
            ->with(['user:id,name', 'position:id,name', 'branch:id,name'])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($w) use ($search) {
                    $w->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy('last_name')
            ->limit(100)
            ->get();

        return response()->json([
            'employees' => $employees->map(fn (Employee $e) => [
                'user_id'  => $e->user_id,
                'name'     => trim($e->last_name . ' ' . $e->first_name) ?: $e->user?->name,
                'position' => $e->position?->name,
                'branch'   => $e->branch?->name,
                'photo'    => $e->photo_url,
            ]),
        ]);
    }

    /**
     * Start (or get existing) direct chat with another user.
     */
    public function startDirect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);
        $other = User::findOrFail($data['user_id']);
        $conv = $this->chat->findOrCreateDirect($this->currentUser(), $other);

        return response()->json(['conversation_id' => $conv->id]);
    }

    /**
     * Bot button click.
     */
    public function botButton(Conversation $conversation, BotButton $button): JsonResponse
    {
        $this->authorizeMember($conversation);

        if (!$conversation->isBot()) {
            abort(422, 'Bot товч bot чатад л идэвхтэй.');
        }

        $result = $this->bot->handleButton($this->currentUser(), $conversation, $button);

        return response()->json([
            'user_message' => $this->serializeMessage($result['user_message']),
            'bot_message'  => $result['bot_message'] ? $this->serializeMessage($result['bot_message']) : null,
            'handoff_id'   => $result['handoff']?->id,
        ]);
    }

    /**
     * Reset bot to welcome screen (or seed the very first message).
     */
    public function botStart(Conversation $conversation): JsonResponse
    {
        $this->authorizeMember($conversation);
        if (!$conversation->isBot()) {
            abort(422, 'Зөвхөн bot чатад ашиглана.');
        }
        $message = $this->bot->sendWelcome($this->currentUser(), $conversation);
        return response()->json(['message' => $this->serializeMessage($message)]);
    }

    protected function authorizeMember(Conversation $conversation): void
    {
        $user = $this->currentUser();
        $isMember = $conversation->participants()
            ->where('user_id', $user->id)
            ->whereNull('left_at')
            ->exists();
        if (!$isMember) {
            \Illuminate\Support\Facades\Log::warning('Chat authorizeMember denied', [
                'user_id'         => $user->id,
                'conversation_id' => $conversation->id,
                'participants'    => $conversation->participants()->get(['user_id', 'left_at'])->toArray(),
            ]);
            abort(Response::HTTP_FORBIDDEN, 'Энэ чатад эрх алга.');
        }
    }

    protected function serializeMessage(Message $m): array
    {
        $meta = $m->meta;

        // Bot card-уудын товчнуудыг одоогийн bot config-аас шинэчилнэ —
        // ингэснээр admin-аас засвар хийгдмэгц чатад автоматаар тусна.
        if ($m->type === Message::TYPE_BOT_CARD && $m->bot_node_id) {
            $node = \App\Models\Bot\BotNode::with(['buttons' => fn ($q) => $q->orderBy('sort_order')])->find($m->bot_node_id);
            if ($node) {
                $buttons = $node->buttons->map(fn ($b) => [
                    'id'             => $b->id,
                    'label'          => $b->label,
                    'icon'           => $b->icon,
                    'action'         => $b->action,
                    'target_node_id' => $b->target_node_id,
                    'target_flow_id' => $b->target_flow_id,
                    'target_url'     => $b->target_url,
                ])->all();
                $meta = array_merge(is_array($meta) ? $meta : [], [
                    'title'   => $node->title,
                    'buttons' => $buttons,
                ]);
            }
        }

        return [
            'id'              => $m->id,
            'conversation_id' => $m->conversation_id,
            'sender_id'       => $m->sender_id,
            'sender_type'     => $m->sender_type,
            'sender'          => $m->sender ? ['id' => $m->sender->id, 'name' => $m->sender->name] : null,
            'body'            => $m->body,
            'type'            => $m->type,
            'bot_node_id'     => $m->bot_node_id,
            'reply_to_id'     => $m->reply_to_id,
            'reply_to'        => $m->replyTo ? [
                'id'        => $m->replyTo->id,
                'body'      => $m->replyTo->body,
                'type'      => $m->replyTo->type,
                'sender_id' => $m->replyTo->sender_id,
                'sender_name' => $m->replyTo->sender?->name,
            ] : null,
            'meta'            => $meta,
            'attachments'     => $m->attachments->map(fn ($a) => [
                'id'            => $a->id,
                'url'           => $a->url,
                'original_name' => $a->original_name,
                'mime_type'     => $a->mime_type,
                'size'          => $a->size,
                'width'         => $a->width,
                'height'        => $a->height,
                'is_image'      => $a->is_image,
            ])->all(),
            'edited_at'       => $m->edited_at?->toIso8601String(),
            'created_at'      => $m->created_at?->toIso8601String(),
        ];
    }
}
