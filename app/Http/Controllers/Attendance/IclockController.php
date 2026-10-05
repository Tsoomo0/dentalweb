<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\HR\AttendanceDevice;
use App\Models\HR\AttendancePunch;
use App\Services\Attendance\AttendanceIngestService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * ZKTeco ADMS (iclock push) протокол — TX628 гэх мэт төхөөрөмж LAN эсвэл
 * интернэтээр өөрөө энд илгээнэ.
 *
 *   GET  /iclock/cdata?SN=..                 handshake → тохиргоо буцаана
 *   POST /iclock/cdata?SN=..&table=ATTLOG    ирцийн бүртгэл (tab-аар тусгаарласан мөрүүд)
 *   POST /iclock/cdata?SN=..&table=OPERLOG   хэрэглэгч нэмсэн гэх мэт (USER PIN=.. мөрөөс нэр авна)
 *   GET  /iclock/getrequest?SN=..            төхөөрөмжид өгөх команд (одоогоор байхгүй → OK)
 *   POST /iclock/devicecmd?SN=..             командын үр дүн
 *
 * Хуучин firmware зөвхөн HTTP-ээр илгээдэг тул энэ замыг HTTPS руу redirect хийж болохгүй.
 * Бүртгэлгүй SN ирвэл идэвхгүй төхөөрөмж үүсгэнэ — HR салбарыг нь сонгож идэвхжүүлтэл
 * бүртгэлийг нь хүлээж авахгүй (төхөөрөмж өөртөө хадгалаад дараа дахин илгээнэ).
 */
class IclockController extends Controller
{
    /** Халдлагаар хуурамч SN-ээр олон төхөөрөмж үүсгэхээс сэргийлэх дээд хязгаар. */
    private const MAX_PENDING_DEVICES = 20;

    public function __construct(private readonly AttendanceIngestService $attendance) {}

    public function cdata(Request $request): Response
    {
        $device = $this->resolveDevice($request);
        if (! $device) {
            return $this->text('ERROR', 400);
        }

        if ($request->isMethod('GET')) {
            return $this->handshake($device);
        }

        if (! $device->is_active) {
            // OK буцаахгүй тул төхөөрөмж бүртгэлээ хадгалсаар, идэвхжсэний дараа дахин илгээнэ.
            return $this->text('ERROR: device is not activated', 403);
        }

        $table = strtoupper((string) $request->query('table', ''));
        $body = (string) $request->getContent();

        if ($table === 'ATTLOG') {
            $result = $this->attendance->ingestDevicePunches($device, $this->parseAttlog($body), AttendancePunch::SOURCE_PUSH);

            $stamp = (string) $request->query('Stamp', '');
            if ($stamp !== '' && ctype_digit($stamp)) {
                $device->forceFill(['push_stamp' => $stamp])->save();
            }

            return $this->text('OK: '.($result['accepted'] + $result['duplicates']));
        }

        if ($table === 'OPERLOG') {
            $users = $this->parseUsers($body);
            if ($users) {
                $this->attendance->syncDeviceUsers($device, $users);
            }
        }

        // ATTPHOTO, OPERLOG-ийн бусад мөр гэх мэт — хадгалах шаардлагагүй.
        return $this->text('OK');
    }

    public function getrequest(Request $request): Response
    {
        $device = $this->resolveDevice($request);
        if (! $device) {
            return $this->text('ERROR', 400);
        }

        // INFO=Ver 6.60 Apr 28 2016,15,30,1234,192.168.1.201,... — firmware, хэрэглэгч, хуруу, бүртгэлийн тоо, IP
        $info = explode(',', (string) $request->query('INFO', ''));
        if (! empty($info[0])) {
            $device->firmware = mb_substr($info[0], 0, 64);
        }
        if (isset($info[3]) && ctype_digit(trim($info[3]))) {
            $device->records_count = (int) trim($info[3]);
        }
        if ($device->isDirty()) {
            $device->save();
        }

        return $this->text('OK');
    }

    public function devicecmd(Request $request): Response
    {
        return $this->resolveDevice($request) ? $this->text('OK') : $this->text('ERROR', 400);
    }

    /** Шинэ firmware-ийн ping гэх мэт бусад /iclock/* хүсэлт. */
    public function fallback(Request $request): Response
    {
        $this->resolveDevice($request);

        return $this->text('OK');
    }

    private function handshake(AttendanceDevice $device): Response
    {
        $stamp = $device->push_stamp ?: 'None';

        return $this->text(implode("\n", [
            "GET OPTION FROM: {$device->serial_number}",
            "ATTLOGStamp={$stamp}",
            'OPERLOGStamp=9999',
            'ATTPHOTOStamp=None',
            'ErrorDelay=60',
            'Delay=30',
            'TransTimes=00:00;14:05',
            'TransInterval=1',
            'TransFlag=TransData AttLog OpLog',
            'TimeZone=8',
            'Realtime=1',
            'Encrypt=None',
        ]));
    }

    private function resolveDevice(Request $request): ?AttendanceDevice
    {
        $sn = trim((string) $request->query('SN', ''));
        if (! preg_match('/^[A-Za-z0-9_-]{4,64}$/', $sn)) {
            return null;
        }

        $device = AttendanceDevice::where('serial_number', $sn)->first();

        if (! $device) {
            $pending = AttendanceDevice::where('connection_type', AttendanceDevice::TYPE_PUSH)
                ->where('is_active', false)
                ->whereNull('branch_id')
                ->count();

            if ($pending >= self::MAX_PENDING_DEVICES) {
                Log::warning('ADMS: хүлээгдэж буй төхөөрөмж хэт олон', ['sn' => $sn, 'ip' => $request->ip()]);

                return null;
            }

            $device = AttendanceDevice::create([
                'name' => "Шинэ төхөөрөмж ({$sn})",
                'connection_type' => AttendanceDevice::TYPE_PUSH,
                'serial_number' => $sn,
                'is_active' => false,
            ]);

            Log::info('ADMS: шинэ төхөөрөмж холбогдлоо', ['sn' => $sn, 'ip' => $request->ip()]);
        }

        $device->forceFill(['last_seen_at' => now(), 'last_ip' => $request->ip(), 'offline_notified_at' => null])->save();

        return $device;
    }

    /**
     * ATTLOG мөр: PIN \t YYYY-MM-DD HH:MM:SS \t төлөв \t баталгаажуулалт \t workcode ...
     *
     * @return list<array{pin: string, punched_at: string, punch_type: ?string, verify_type: ?string}>
     */
    private function parseAttlog(string $body): array
    {
        $punches = [];

        foreach (preg_split('/\r\n|\r|\n/', $body) as $line) {
            $cols = explode("\t", trim($line));
            if (count($cols) < 2) {
                continue;
            }

            $punches[] = [
                'pin' => trim($cols[0]),
                'punched_at' => trim($cols[1]),
                'punch_type' => $cols[2] ?? null,
                'verify_type' => $cols[3] ?? null,
            ];
        }

        return $punches;
    }

    /**
     * OPERLOG доторх "USER PIN=1\tName=Бат\tPri=0..." мөрүүд.
     *
     * @return list<array{pin: string, name: ?string}>
     */
    private function parseUsers(string $body): array
    {
        $users = [];

        foreach (preg_split('/\r\n|\r|\n/', $body) as $line) {
            if (! str_starts_with($line, 'USER ')) {
                continue;
            }

            $fields = [];
            foreach (explode("\t", substr($line, 5)) as $pair) {
                [$key, $value] = array_pad(explode('=', $pair, 2), 2, '');
                $fields[trim($key)] = trim($value);
            }

            if (($fields['PIN'] ?? '') !== '') {
                $users[] = ['pin' => $fields['PIN'], 'name' => ($fields['Name'] ?? '') ?: null];
            }
        }

        return $users;
    }

    private function text(string $body, int $status = 200): Response
    {
        return response($body, $status)->header('Content-Type', 'text/plain');
    }
}
