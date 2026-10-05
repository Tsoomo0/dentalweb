<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceDevice;
use App\Models\HR\AttendancePunch;
use App\Services\Attendance\AttendanceIngestService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Салбарын 4370 агентаас ирэх бүртгэл (JDF200 гэх мэт ADMS-гүй төхөөрөмж).
 *
 * Агент 5 минут тутам төхөөрөмжөөс уншаад энд илгээнэ. Хоосон punches-тай
 * хүсэлт ч "амьд байна" дохио болж last_seen_at-ийг шинэчилнэ.
 */
class AgentIngestController extends Controller
{
    public function __construct(private readonly AttendanceIngestService $attendance) {}

    public function __invoke(Request $request): JsonResponse
    {
        /** @var AttendanceDevice $device */
        $device = $request->attributes->get('attendance_device');

        $data = $request->validate([
            'device' => 'nullable|array',
            'device.serial' => 'nullable|string|max:64',
            'device.firmware' => 'nullable|string|max:64',
            'device.model' => 'nullable|string|max:64',
            'device.device_time' => 'nullable|date_format:Y-m-d H:i:s',
            'device.records' => 'nullable|integer|min:0',
            'device.records_capacity' => 'nullable|integer|min:0',
            'punches' => 'nullable|array|max:5000',
            'punches.*.pin' => 'required|string|max:32',
            'punches.*.punched_at' => 'required|date_format:Y-m-d H:i:s',
            'punches.*.punch_type' => 'nullable|integer|between:0,255',
            'punches.*.verify_type' => 'nullable|integer|between:0,255',
            'users' => 'nullable|array|max:5000',
            'users.*.pin' => 'required|string|max:32',
            'users.*.name' => 'nullable|string|max:100',
        ]);

        $info = $data['device'] ?? [];
        $serial = trim((string) ($info['serial'] ?? ''));

        // Токен нь өөр төхөөрөмжийнх бол бүртгэлийг буруу салбарт бичихгүйн тулд татгалзана.
        if ($serial !== '' && $device->serial_number && $device->serial_number !== $serial) {
            Log::warning('Ирцийн агент: serial таарахгүй', ['device' => $device->id, 'expected' => $device->serial_number, 'given' => $serial]);

            return response()->json([
                'ok' => false,
                'message' => "Энэ токен {$device->serial_number} төхөөрөмжийнх. Агент {$serial} төхөөрөмжид холбогдсон байна.",
            ], 409);
        }

        $meta = [
            'last_seen_at' => now(),
            'offline_notified_at' => null, // дахин холбогдсон — дараагийн тасралтад дахин мэдэгдэнэ
            'last_ip' => $request->ip(),
            'firmware' => $info['firmware'] ?? $device->firmware,
            'model' => $info['model'] ?? $device->model,
        ];

        if ($serial !== '' && ! $device->serial_number
            && ! AttendanceDevice::where('serial_number', $serial)->exists()) {
            $meta['serial_number'] = $serial;
        }

        if (isset($info['records'])) {
            $meta['records_count'] = (int) $info['records'];
            $meta['records_capacity'] = isset($info['records_capacity']) ? (int) $info['records_capacity'] : $device->records_capacity;
        }

        if (! empty($info['device_time'])) {
            $meta['clock_drift_seconds'] = (int) now()->diffInSeconds(Carbon::parse($info['device_time']), false);
        }

        $device->forceFill($meta)->save();

        if (! empty($data['users'])) {
            $this->attendance->syncDeviceUsers($device, $data['users']);
        }

        $result = $this->attendance->ingestDevicePunches($device, $data['punches'] ?? [], AttendancePunch::SOURCE_PULL);

        return response()->json([
            'ok' => true,
            ...$result,
            'server_time' => now()->format('Y-m-d H:i:s'),
        ]);
    }
}
