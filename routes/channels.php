<?php

use App\Models\Chat\Conversation;
use App\Models\Doctor;
use App\Models\HR\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;

// Broadcasting auth routes — accept both web and doctor guards.
Broadcast::routes(['middleware' => ['web', 'either.auth']]);

/**
 * Resolve the underlying User for the broadcasting request,
 * regardless of which guard authenticated them.
 */
if (! function_exists('chatUser')) {
    function chatUser($user): ?User
    {
        if ($user instanceof User) {
            return $user;
        }
        // Doctor was passed in directly — resolve to its linked User.
        if ($user instanceof Doctor) {
            if ($user->employee_id) {
                $employee = Employee::find($user->employee_id);
                if ($employee?->user_id) {
                    return User::find($employee->user_id);
                }
            }

            return null;
        }
        // Fallback: explicitly read from either guard.
        if (Auth::guard('web')->check()) {
            return Auth::guard('web')->user();
        }
        if (Auth::guard('doctor')->check()) {
            $doctor = Auth::guard('doctor')->user();
            $employeeId = $doctor?->employee_id;
            if ($employeeId) {
                $employee = Employee::find($employeeId);
                if ($employee?->user_id) {
                    return User::find($employee->user_id);
                }
            }
        }

        return null;
    }
}

// ── User inbox ───────────────────────────────────────────────────────────────
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    $u = chatUser($user);

    return $u && (int) $u->id === (int) $id;
});

Broadcast::channel('daily-sheet.{branchId}.{date}', function ($user, $branchId) {
    $u = chatUser($user);

    return $u && $u->branch_id == $branchId;
});

// ── Chat ─────────────────────────────────────────────────────────────────────

Broadcast::channel('chat.user.{userId}', function ($user, int $userId) {
    $u = chatUser($user);

    return $u && (int) $u->id === $userId;
});

Broadcast::channel('chat.conversation.{conversationId}', function ($user, int $conversationId) {
    $u = chatUser($user);
    if (! $u) {
        return false;
    }

    return Conversation::query()
        ->whereKey($conversationId)
        ->whereHas('participants', function ($q) use ($u) {
            $q->where('user_id', $u->id)->whereNull('left_at');
        })
        ->exists();
});

Broadcast::channel('presence-chat.conversation.{conversationId}', function ($user, int $conversationId) {
    $u = chatUser($user);
    if (! $u) {
        return false;
    }

    $isMember = Conversation::query()
        ->whereKey($conversationId)
        ->whereHas('participants', function ($q) use ($u) {
            $q->where('user_id', $u->id)->whereNull('left_at');
        })
        ->exists();

    if (! $isMember) {
        return false;
    }

    return ['id' => $u->id, 'name' => $u->name];
});

Broadcast::channel('chat.handoff-inbox', function ($user) {
    $u = chatUser($user);

    return $u && ($u->isAdmin() || $u->isReceptionist());
});

// ── Social Bot inbox (admin) ───────────────────────────────────────────────────
Broadcast::channel('social.inbox', function ($user) {
    $u = chatUser($user);

    return $u && $u->isAdmin();
});

Broadcast::channel('social.conversation.{conversationId}', function ($user, int $conversationId) {
    $u = chatUser($user);

    return $u && $u->isAdmin();
});
