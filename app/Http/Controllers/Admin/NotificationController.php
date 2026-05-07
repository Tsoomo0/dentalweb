<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
            'items'        => $user->notifications()->latest()->take(15)->get()
                ->map(fn ($n) => [
                    'id'         => $n->id,
                    'notif_type' => class_basename($n->type),
                    'data'       => $n->data,
                    'read_at'    => $n->read_at?->toIso8601String(),
                    'created_at' => $n->created_at->diffForHumans(),
                ])->all(),
        ]);
    }

    public function markRead(string $id): JsonResponse
    {
        Auth::user()->notifications()->findOrFail($id)->markAsRead();
        return response()->json(['ok' => true]);
    }

    public function markAllRead(): JsonResponse
    {
        Auth::user()->unreadNotifications->markAsRead();
        return response()->json(['ok' => true]);
    }

    public function clearAll(): JsonResponse
    {
        Auth::user()->notifications()->delete();
        return response()->json(['ok' => true]);
    }
}
