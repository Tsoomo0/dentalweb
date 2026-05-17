<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\HR\Employee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    private function resolveUser(): ?User
    {
        if ($user = Auth::user()) {
            return $user;
        }

        if (Auth::guard('doctor')->check()) {
            $doctor = Auth::guard('doctor')->user();
            if ($doctor->employee_id) {
                $emp = Employee::with('user')->find($doctor->employee_id);

                return $emp?->user;
            }
        }

        return null;
    }

    public function index(): JsonResponse
    {
        $user = $this->resolveUser();
        if (! $user) {
            return response()->json(['unread_count' => 0, 'items' => []]);
        }

        $portal = request()->query('portal', 'admin');
        $allowed = HandleInertiaRequests::portalNotifTypes($portal.'/');
        $typeClasses = $allowed
            ? collect($allowed)->map(fn ($t) => "App\\Notifications\\{$t}")->toArray()
            : null;

        $query = $user->notifications()->latest();
        if ($typeClasses) {
            $query->whereIn('type', $typeClasses);
        }

        return response()->json([
            'unread_count' => $typeClasses
                ? $user->unreadNotifications()->whereIn('type', $typeClasses)->count()
                : $user->unreadNotifications()->count(),
            'items' => $query->take(15)->get()->map(fn ($n) => [
                'id' => $n->id,
                'notif_type' => class_basename($n->type),
                'data' => $n->data,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at->diffForHumans(),
            ])->all(),
        ]);
    }

    public function markRead(string $id): JsonResponse
    {
        $user = $this->resolveUser();
        if (! $user) {
            return response()->json(['ok' => false], 401);
        }

        $user->notifications()->findOrFail($id)->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllRead(): JsonResponse
    {
        $user = $this->resolveUser();
        if (! $user) {
            return response()->json(['ok' => false], 401);
        }

        $user->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function clearAll(): JsonResponse
    {
        $user = $this->resolveUser();
        if (! $user) {
            return response()->json(['ok' => false], 401);
        }

        $user->notifications()->delete();

        return response()->json(['ok' => true]);
    }
}
