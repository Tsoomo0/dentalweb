<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Services\HR\SealLock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Тамга / гарын үсгийн түгжээг нээх, хаах, төлвийг харах.
 */
class SealLockController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'unlocked' => SealLock::isUnlocked($request),
            'expires_in' => SealLock::remaining($request),
        ]);
    }

    public function unlock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:64'],
        ], [
            'code.required' => 'Хамгаалалтын кодоо оруулна уу',
        ]);

        if (! SealLock::verify($validated['code'])) {
            return response()->json(['message' => 'Код буруу байна.'], 422);
        }

        SealLock::unlock($request);

        return response()->json(['unlocked' => true, 'expires_in' => SealLock::TTL]);
    }

    public function lock(Request $request): JsonResponse
    {
        SealLock::lock($request);

        return response()->json(['unlocked' => false, 'expires_in' => 0]);
    }
}
