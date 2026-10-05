<?php

namespace App\Http\Middleware;

use App\Models\HR\AttendanceDevice;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * 4370 агентыг төхөөрөмж бүрийн токеноор (Authorization: Bearer ...) таньна.
 * Токены зөвхөн sha256-г хадгалдаг тул DB алдагдсан ч агент дуурайх боломжгүй.
 */
class VerifyAttendanceAgent
{
    public function handle(Request $request, Closure $next): Response
    {
        $device = AttendanceDevice::findByApiToken((string) $request->bearerToken());

        if (! $device || $device->connection_type !== AttendanceDevice::TYPE_PULL) {
            Log::warning('Ирцийн агент: буруу токен', ['ip' => $request->ip()]);

            return response()->json(['ok' => false, 'message' => 'Токен буруу байна.'], 401);
        }

        if (! $device->is_active) {
            return response()->json(['ok' => false, 'message' => 'Төхөөрөмж идэвхгүй байна.'], 403);
        }

        $request->attributes->set('attendance_device', $device);

        return $next($request);
    }
}
