<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushSubscriptionController extends Controller
{
    public function vapidKey(): JsonResponse
    {
        return response()->json([
            'public_key' => (string) config('webpush.vapid.public_key'),
        ]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint'     => 'required|string',
            'keys.p256dh'  => 'required|string',
            'keys.auth'    => 'required|string',
            'user_agent'   => 'nullable|string',
        ]);

        $sub = PushSubscription::updateOrCreate(
            [
                'user_id'   => Auth::id(),
                'p256dh_key' => $data['keys']['p256dh'],
            ],
            [
                'endpoint'     => $data['endpoint'],
                'auth_token'   => $data['keys']['auth'],
                'user_agent'   => $data['user_agent'] ?? $request->userAgent(),
                'last_used_at' => now(),
            ]
        );

        return response()->json(['id' => $sub->id]);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $data = $request->validate(['endpoint' => 'required|string']);
        PushSubscription::query()
            ->where('user_id', Auth::id())
            ->where('endpoint', $data['endpoint'])
            ->delete();
        return response()->json(['ok' => true]);
    }
}
