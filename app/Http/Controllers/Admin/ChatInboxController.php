<?php

namespace App\Http\Controllers\Admin;

use App\Events\Chat\ConversationUpdated;
use App\Http\Controllers\Controller;
use App\Models\Chat\Conversation;
use App\Models\Chat\Handoff;
use App\Models\HR\Employee;
use App\Models\User;
use App\Services\Chat\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ChatInboxController extends Controller
{
    public function __construct(protected ChatService $chat) {}

    /**
     * Admin chat inbox page (Inertia).
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('admin/ChatInbox/Index');
    }

    /**
     * Pending + assigned handoff queue.
     */
    public function listHandoffs(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $handoffs = Handoff::query()
            ->whereIn('status', match ($status) {
                'all' => ['pending', 'assigned', 'closed'],
                'open' => ['pending', 'assigned'],
                default => [$status],
            })
            ->with([
                'user:id,name',
                'assignedAdmin:id,name',
                'botConversation:id,last_message_at',
            ])
            ->latest('id')
            ->limit(100)
            ->get();

        return response()->json([
            'handoffs' => $handoffs->map(fn (Handoff $h) => [
                'id' => $h->id,
                'status' => $h->status,
                'reason' => $h->reason,
                'user' => $h->user ? ['id' => $h->user->id, 'name' => $h->user->name] : null,
                'assigned_admin' => $h->assignedAdmin ? ['id' => $h->assignedAdmin->id, 'name' => $h->assignedAdmin->name] : null,
                'bot_conversation_id' => $h->bot_conversation_id,
                'direct_conversation_id' => $h->direct_conversation_id,
                'assigned_at' => $h->assigned_at?->toIso8601String(),
                'closed_at' => $h->closed_at?->toIso8601String(),
                'created_at' => $h->created_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Take a pending handoff: assign to me + create direct chat with the user.
     */
    public function claimHandoff(Handoff $handoff): JsonResponse
    {
        $admin = Auth::user();

        if ($handoff->status === Handoff::STATUS_CLOSED) {
            abort(422, 'Энэ хүсэлт хаагдсан байна.');
        }

        return DB::transaction(function () use ($handoff, $admin) {
            // Reload with lock to prevent double-claim.
            $h = Handoff::query()->lockForUpdate()->findOrFail($handoff->id);

            if ($h->status === Handoff::STATUS_ASSIGNED && $h->assigned_admin_id && $h->assigned_admin_id !== $admin->id) {
                abort(409, 'Энэ хүсэлтийг өөр админ авсан байна.');
            }

            $directConv = null;
            if ($h->direct_conversation_id) {
                $directConv = Conversation::find($h->direct_conversation_id);
            }
            if (! $directConv) {
                $user = User::findOrFail($h->user_id);
                $directConv = $this->chat->findOrCreateDirect($admin, $user);
            }

            $h->update([
                'assigned_admin_id' => $admin->id,
                'direct_conversation_id' => $directConv->id,
                'status' => Handoff::STATUS_ASSIGNED,
                'assigned_at' => now(),
            ]);

            // Tell the user their handoff was picked up — they can now message in the new direct chat.
            broadcast(new ConversationUpdated(
                $directConv->id,
                [$h->user_id, $admin->id],
                ['handoff_assigned' => true]
            ));

            return response()->json([
                'handoff' => [
                    'id' => $h->id,
                    'status' => $h->status,
                    'direct_conversation_id' => $h->direct_conversation_id,
                ],
            ]);
        });
    }

    public function closeHandoff(Handoff $handoff): JsonResponse
    {
        $handoff->update([
            'status' => Handoff::STATUS_CLOSED,
            'closed_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Create a group chat. Only admin/HR/receptionist can call this.
     */
    public function createGroup(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (! $user->isStaff()) {
            abort(403, 'Группын чат үүсгэх эрх алга.');
        }

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer|exists:users,id',
            'avatar' => 'nullable|string',
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
     * List employees available for group creation / direct messaging.
     */
    public function listStaff(Request $request): JsonResponse
    {
        $search = (string) $request->query('q', '');

        $employees = Employee::query()
            ->whereNotNull('user_id')
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
                'user_id' => $e->user_id,
                'name' => trim($e->last_name.' '.$e->first_name) ?: $e->user?->name,
                'position' => $e->position?->name,
                'branch' => $e->branch?->name,
                'photo' => $e->photo_url,
            ]),
        ]);
    }
}
