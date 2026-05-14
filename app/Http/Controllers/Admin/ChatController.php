<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ChatController extends Controller
{
    public function index(): InertiaResponse
    {
        $user = Auth::user();
        $myChat = app(\App\Http\Controllers\My\ChatController::class);
        // Use reflection-friendly call via a public proxy on My\ChatController.
        $payload = $myChat->preloadConversations($user);

        return Inertia::render('admin/Chat/Index', [
            'currentUserId'        => $user->id,
            'isStaff'              => true,
            'initialConversations' => $payload,
        ]);
    }
}
