<?php

namespace App\Services\Attendance;

use App\Models\HR\AttendanceDevice;
use App\Models\HR\AttendanceDeviceUser;
use App\Models\HR\AttendanceLog;
use App\Models\HR\AttendancePunch;
use App\Models\HR\Employee;
use App\Models\User;
use App\Notifications\LateCheckIn;
use App\Services\Schedule\RosterLookup;
use App\Services\Schedule\ScheduleSettings;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Ирцийн гурван арга (байршил / 4370 агент / ADMS push) + USB файл бүгд энд нийлнэ.
 *
 *   1. Түүхий бүртгэлийг attendance_punches-д хадгална — UNIQUE(device, pin, цаг)
 *      тул нэг бүртгэлийг хэдэн ч удаа илгээсэн давхардахгүй (idempotent).
 *   2. Төхөөрөмжийн PIN-ийг ажилтантай тааруулна (attendance_device_users).
 *   3. Өртсөн өдрүүдийн attendance_logs (өдрийн нэгтгэл)-ийг punch-аас дахин тооцоолно:
 *      ирсэн = өдрийн эхний бүртгэл, тарсан = сүүлийнх. Төхөөрөмжийн in/out
 *      товчийг ажилчид ихэвчлэн дардаггүй тул punch_type-д найдахгүй.
 *
 * Төхөөрөмж дээрх логийг хэзээ ч устгахгүй — энэ сервис зөвхөн уншиж хадгална.
 */
class AttendanceIngestService
{
    /**
     * Өмнөх бүртгэлээс энэ хугацааны дотор дахин дарсныг нэг үйлдэл гэж үзнэ —
     * бүртгэгдсэн эсэхэд эргэлзээд ирэхдээ ч, тарахдаа ч 2-3 дардаг.
     * Бүлэг бүрийн ЭХНИЙ цаг л тооцогдоно. GPS-ийн "Тарах" товч санаатай
     * үйлдэл тул үргэлж шинэ бүлэг эхлүүлнэ.
     */
    public const CLUSTER_GAP_MINUTES = 5;

    /**
     * Төхөөрөмжөөс ирсэн бүртгэлүүдийг хадгална.
     *
     * @param  array<int, array{pin: mixed, punched_at: mixed, punch_type?: mixed, verify_type?: mixed}>  $punches
     * @return array{accepted: int, duplicates: int, unmatched_pins: list<string>}
     */
    public function ingestDevicePunches(AttendanceDevice $device, array $punches, string $source, bool $notify = true): array
    {
        $rows = $this->normalize($punches);

        if ($rows === []) {
            return ['accepted' => 0, 'duplicates' => 0, 'unmatched_pins' => []];
        }

        $pins = array_values(array_unique(array_column($rows, 'pin')));

        $times = array_column($rows, 'punched_at');
        $existing = AttendancePunch::query()
            ->where('attendance_device_id', $device->id)
            ->whereIn('device_user_pin', $pins)
            ->whereBetween('punched_at', [min($times), max($times)])
            ->toBase()
            ->get(['device_user_pin', 'punched_at'])
            ->mapWithKeys(fn ($p) => [$p->device_user_pin.'|'.substr((string) $p->punched_at, 0, 19) => true]);

        // Зөвхөн ШИНЭ бүртгэлтэй PIN дээр л идэвхгүй ажилтны тааруулалтыг шалгана —
        // агент 24 цагийн давхцалтайгаар хуучныг дахин илгээдэг.
        $pinsWithNew = array_values(array_unique(array_column(
            array_diff_key($rows, $existing->all()), 'pin',
        )));
        $employeeByPin = $this->resolvePins($device, $pins, releaseInactiveFor: $pinsWithNew);

        $now = now();
        $insert = [];
        $affected = [];

        foreach ($rows as $key => $row) {
            if (isset($existing[$key])) {
                continue;
            }

            $employeeId = $employeeByPin[$row['pin']] ?? null;

            $insert[] = [
                'employee_id' => $employeeId,
                'attendance_device_id' => $device->id,
                'device_user_pin' => $row['pin'],
                'punched_at' => $row['punched_at'],
                'punch_type' => $row['punch_type'],
                'verify_type' => $row['verify_type'],
                'source' => $source,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if ($employeeId) {
                $affected[$employeeId][substr($row['punched_at'], 0, 10)] = true;
            }
        }

        // Зэрэг ирсэн хүсэлт ижил мөр оруулахаар уралдсан ч UNIQUE индекс хамгаална.
        foreach (array_chunk($insert, 500) as $chunk) {
            AttendancePunch::insertOrIgnore($chunk);
        }

        foreach ($affected as $employeeId => $dates) {
            foreach (array_keys($dates) as $date) {
                $this->rebuildDay($employeeId, $date, $notify);
            }
        }

        $latest = max($times);
        if (! $device->last_punch_at || $device->last_punch_at->format('Y-m-d H:i:s') < $latest) {
            $device->forceFill(['last_punch_at' => $latest])->save();
        }

        $unmatched = array_values(array_filter($pins, fn ($pin) => empty($employeeByPin[$pin])));

        return [
            'accepted' => count($insert),
            'duplicates' => count($rows) - count($insert),
            'unmatched_pins' => $unmatched,
        ];
    }

    /**
     * Утаснаас байршлаар бүртгэсэн ирсэн/тарсан цаг.
     */
    public function recordGps(Employee $employee, int $punchType, ?float $lat, ?float $lng): AttendanceLog
    {
        $now = now()->startOfSecond();

        AttendancePunch::create([
            'employee_id' => $employee->id,
            'punched_at' => $now,
            'punch_type' => $punchType,
            'source' => AttendancePunch::SOURCE_GPS,
            'lat' => $lat,
            'lng' => $lng,
        ]);

        return $this->rebuildDay($employee->id, $now->toDateString());
    }

    /**
     * HR гараар ирсэн/тарсан цаг нэмнэ — хуруу дарахаа мартсан үед.
     * Төхөөрөмжийн бүртгэлд хүрэхгүй, зөвхөн нэмэлт бүртгэл үүсгэнэ.
     */
    public function addManualPunches(Employee $employee, string $date, ?string $in, ?string $out, string $note, User $by): ?AttendanceLog
    {
        foreach ([AttendancePunch::TYPE_IN => $in, AttendancePunch::TYPE_OUT => $out] as $type => $time) {
            if (! $time) {
                continue;
            }

            AttendancePunch::create([
                'employee_id' => $employee->id,
                'punched_at' => Carbon::parse("{$date} {$time}"),
                'punch_type' => $type,
                'source' => AttendancePunch::SOURCE_MANUAL,
                'note' => $note,
                'created_by' => $by->id,
            ]);
        }

        return $this->rebuildDay($employee->id, $date, notify: false);
    }

    /** Зөвхөн гараар нэмсэн бүртгэлийг устгана — төхөөрөмжийн бүртгэл хэзээ ч устахгүй. */
    public function deleteManualPunch(AttendancePunch $punch): void
    {
        if ($punch->source !== AttendancePunch::SOURCE_MANUAL) {
            throw new \LogicException('Зөвхөн гараар нэмсэн бүртгэлийг устгана.');
        }

        $employeeId = $punch->employee_id;
        $date = $punch->punched_at->toDateString();
        $punch->delete();

        if ($employeeId) {
            $this->rebuildDay($employeeId, $date, notify: false);
        }
    }

    /**
     * Төхөөрөмжийн хэрэглэгчдийн нэрийг шинэчилнэ (агент/ADMS-ээс ирсэн жагсаалт).
     * Тааруулалтад гар хүрэхгүй — нэр нь HR-д тааруулах санал гаргахад хэрэглэгдэнэ.
     *
     * @param  array<int, array{pin: mixed, name?: mixed}>  $users
     */
    public function syncDeviceUsers(AttendanceDevice $device, array $users): void
    {
        $names = [];
        foreach ($users as $user) {
            $pin = trim((string) ($user['pin'] ?? ''));
            if ($pin !== '' && mb_strlen($pin) <= 32) {
                $names[$pin] = $this->cleanName((string) ($user['name'] ?? ''));
            }
        }

        if ($names === []) {
            return;
        }

        $this->resolvePins($device, array_keys($names), $names);

        $known = AttendanceDeviceUser::where('attendance_device_id', $device->id)
            ->whereIn('device_user_pin', array_map('strval', array_keys($names)))
            ->get();

        foreach ($known as $deviceUser) {
            $name = $names[$deviceUser->device_user_pin] ?? null;
            if ($name !== null && $deviceUser->name !== $name) {
                $deviceUser->update(['name' => $name]);
            }
        }
    }

    /**
     * PIN-ийг ажилтантай тааруулах (эсвэл тааруулалтыг цуцлах). Тухайн PIN-ийн
     * бүх хуучин бүртгэлийг шилжүүлж, хуучин болон шинэ ажилтны өдрүүдийг дахин тооцоолно.
     */
    public function assignEmployee(AttendanceDeviceUser $deviceUser, ?int $employeeId): void
    {
        $previous = $deviceUser->employee_id;

        DB::transaction(function () use ($deviceUser, $employeeId) {
            // Нуусан PIN-ийг тааруулбал жагсаалтад буцаж гарна
            $deviceUser->update($employeeId ? ['employee_id' => $employeeId, 'hidden_at' => null] : ['employee_id' => null]);

            AttendancePunch::where('attendance_device_id', $deviceUser->attendance_device_id)
                ->where('device_user_pin', $deviceUser->device_user_pin)
                ->update(['employee_id' => $employeeId]);
        });

        $dates = AttendancePunch::where('attendance_device_id', $deviceUser->attendance_device_id)
            ->where('device_user_pin', $deviceUser->device_user_pin)
            ->selectRaw('DISTINCT DATE(punched_at) as d')
            ->pluck('d');

        foreach (array_filter(array_unique([$previous, $employeeId])) as $id) {
            foreach ($dates as $date) {
                $this->rebuildDay($id, (string) $date, notify: false);
            }
        }
    }

    /**
     * Нэг ажилтны нэг өдрийн нэгтгэлийг тухайн өдрийн бүх бүртгэлээс дахин тооцоолно.
     * Хэдэн ч удаа дуудсан ижил үр дүн гарна.
     */
    public function rebuildDay(int $employeeId, string $date, bool $notify = true): ?AttendanceLog
    {
        // GPS, push, агент зэрэг нэг ажилтны нэг өдрийг зэрэг тооцоолбол давхар мөр үүсэхээс сэргийлнэ.
        return Cache::lock("attendance-day:{$employeeId}:{$date}", 10)
            ->block(5, fn () => $this->rebuildDayUnlocked($employeeId, $date, $notify));
    }

    private function rebuildDayUnlocked(int $employeeId, string $date, bool $notify): ?AttendanceLog
    {
        $punches = AttendancePunch::where('employee_id', $employeeId)
            ->whereBetween('punched_at', ["{$date} 00:00:00", "{$date} 23:59:59"])
            ->orderBy('punched_at')
            ->orderBy('id')
            ->get();

        $log = AttendanceLog::where('employee_id', $employeeId)->whereDate('date', $date)->first();

        if ($punches->isEmpty()) {
            // Тааруулалт өөрчлөгдөж бүртгэлгүй болсон өдөр — HR-ийн тэмдэглэлгүй бол мөрийг арилгана.
            if ($log && $log->notes === null) {
                $log->delete();
            } elseif ($log) {
                $log->update($this->emptyTimes());
            }

            return null;
        }

        $clusters = $this->clusters($punches);
        $first = $clusters[0][0];
        // Тарсан = сүүлийн бүлгийн ЭХНИЙ бүртгэл (тарахдаа 2-3 дарсан ч анх уншуулсан цаг)
        $last = count($clusters) > 1 ? $clusters[count($clusters) - 1][0] : null;

        $wasCheckedIn = $log?->checked_in_at !== null;

        $log ??= new AttendanceLog(['employee_id' => $employeeId, 'date' => $date]);
        $log->fill([
            'checked_in_at' => $first->punched_at,
            'check_in_source' => $first->source,
            'check_in_lat' => $first->lat,
            'check_in_lng' => $first->lng,
            'checked_out_at' => $last?->punched_at,
            'check_out_source' => $last?->source,
            'check_out_lat' => $last?->lat,
            'check_out_lng' => $last?->lng,
        ])->save();

        if ($notify && ! $wasCheckedIn && $date === today()->toDateString()) {
            $this->notifyIfLate($employeeId, $first->punched_at, $date);
        }

        return $log;
    }

    /**
     * Ажлаас гарсан (идэвхгүй) ажилтны PIN дээр шинэ бүртгэл ирвэл тэр PIN-ийг шинэ
     * хүнд олгосон байж магадгүй — ирцийг нь гарсан хүнд чимээгүй бичихийн оронд
     * тааруулалтыг салгаж «Тааруулаагүй» руу гаргана. Хуучин бүртгэлүүд хэвээр үлдэнэ.
     *
     * @param  array<string, ?int>  $known
     * @param  list<string>  $pins  шинэ бүртгэл ирсэн PIN-үүд
     */
    private function releaseInactiveMappings(AttendanceDevice $device, array &$known, array $pins): void
    {
        $mapped = array_filter($known, fn ($employeeId, $pin) => $employeeId && in_array((string) $pin, $pins, true), ARRAY_FILTER_USE_BOTH);
        if ($mapped === []) {
            return;
        }

        $inactive = Employee::withTrashed()
            ->whereIn('id', array_unique($mapped))
            ->where(fn ($q) => $q->where('status', '!=', 'active')->orWhereNotNull('deleted_at'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        foreach ($mapped as $pin => $employeeId) {
            if (in_array((int) $employeeId, $inactive, true)) {
                AttendanceDeviceUser::where('attendance_device_id', $device->id)
                    ->where('device_user_pin', (string) $pin)
                    ->update(['employee_id' => null]);

                Log::info('Ирц: идэвхгүй ажилтны PIN дахин ашиглагдлаа — тааруулалтыг салгав', [
                    'device' => $device->id, 'pin' => (string) $pin, 'employee' => $employeeId,
                ]);

                $known[$pin] = null;
            }
        }
    }

    /**
     * Цагийн дарааллаар эрэмбэлсэн бүртгэлүүдийг ойрхон дарсан бүлгүүдэд хуваана.
     *
     * @param  Collection<int, AttendancePunch>  $punches
     * @return list<list<AttendancePunch>>
     */
    private function clusters(Collection $punches): array
    {
        $clusters = [];
        $previous = null;

        foreach ($punches as $punch) {
            if ($previous && ! $punch->isExplicitOut()
                && $previous->punched_at->diffInMinutes($punch->punched_at) < self::CLUSTER_GAP_MINUTES) {
                $clusters[count($clusters) - 1][] = $punch;
            } else {
                $clusters[] = [$punch];
            }

            $previous = $punch;
        }

        return $clusters;
    }

    /**
     * PIN бүрийн ажилтныг олно. Шинэ PIN-д тааруулаагүй мөр үүсгэнэ.
     *
     * Төхөөрөмж дээрх ID системийн ажилтны дугаартай зөрдөг тул дугаараар
     * автоматаар тааруулахгүй — буруу хүнд ирц бичигдэхээс сэргийлнэ.
     * Нэрээр гаргасан саналыг HR баталгаажуулна (DeviceUserMatcher).
     *
     * @param  list<string>  $pins
     * @param  array<string, ?string>  $names
     * @return array<string, ?int>
     */
    private function resolvePins(AttendanceDevice $device, array $pins, array $names = [], array $releaseInactiveFor = []): array
    {
        $pins = array_map('strval', $pins);

        $known = AttendanceDeviceUser::where('attendance_device_id', $device->id)
            ->whereIn('device_user_pin', $pins)
            ->pluck('employee_id', 'device_user_pin')
            ->all();

        if ($releaseInactiveFor !== []) {
            $this->releaseInactiveMappings($device, $known, array_map('strval', $releaseInactiveFor));
        }

        foreach ($pins as $pin) {
            if (array_key_exists($pin, $known)) {
                continue;
            }

            $deviceUser = AttendanceDeviceUser::firstOrCreate(
                ['attendance_device_id' => $device->id, 'device_user_pin' => $pin],
                ['name' => $names[$pin] ?? null],
            );

            $known[$pin] = $deviceUser->employee_id;
        }

        return $known;
    }

    /**
     * PIN хоосон, огноо буруу мөрүүдийг хаяж, batch доторх давхардлыг арилгана.
     *
     * @return array<string, array{pin: string, punched_at: string, punch_type: ?int, verify_type: ?int}>
     */
    private function normalize(array $punches): array
    {
        $rows = [];
        // Төхөөрөмжийн цаг алдагдсан (2000 он гэх мэт) эсвэл ирээдүйн бүртгэлийг авахгүй.
        $min = '2015-01-01 00:00:00';
        $max = now()->addDay()->format('Y-m-d H:i:s');

        foreach ($punches as $punch) {
            $pin = trim((string) ($punch['pin'] ?? ''));
            if ($pin === '' || mb_strlen($pin) > 32) {
                continue;
            }

            try {
                $at = Carbon::parse((string) ($punch['punched_at'] ?? ''))->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                continue;
            }

            if ($at < $min || $at > $max) {
                continue;
            }

            $rows[$pin.'|'.$at] = [
                'pin' => $pin,
                'punched_at' => $at,
                'punch_type' => $this->smallInt($punch['punch_type'] ?? null),
                'verify_type' => $this->smallInt($punch['verify_type'] ?? null),
            ];
        }

        return $rows;
    }

    /**
     * Хятад firmware нэрийг GBK-аар илгээж болно — UTF-8 биш байт DB-д алдаа өгөхөөс сэргийлнэ.
     */
    private function cleanName(string $name): ?string
    {
        if (! mb_check_encoding($name, 'UTF-8')) {
            $converted = @mb_convert_encoding($name, 'UTF-8', 'GBK');
            $name = is_string($converted) && mb_check_encoding($converted, 'UTF-8') ? $converted : '';
        }

        $name = trim(preg_replace('/[\x00-\x1F\x7F]+/u', '', $name) ?? '');

        return $name === '' ? null : mb_substr($name, 0, 100);
    }

    private function smallInt(mixed $value): ?int
    {
        return is_numeric($value) && (int) $value >= 0 && (int) $value <= 255 ? (int) $value : null;
    }

    private function emptyTimes(): array
    {
        return [
            'checked_in_at' => null, 'check_in_source' => null, 'check_in_lat' => null, 'check_in_lng' => null,
            'checked_out_at' => null, 'check_out_source' => null, 'check_out_lat' => null, 'check_out_lng' => null,
        ];
    }

    private function notifyIfLate(int $employeeId, Carbon $checkedInAt, string $date): void
    {
        // Зөвхөн нийтлэгдсэн хуваарьтай харьцуулна; хүлцлийн (grace) доторх хоцролтыг мэдэгдэхгүй.
        $plan = RosterLookup::forDay($employeeId, $date);
        if (! $plan || ! $plan['work'] || $plan['start_min'] === null) {
            return;
        }

        $lateMinutes = ($checkedInAt->hour * 60 + $checkedInAt->minute) - $plan['start_min'];

        if ($lateMinutes <= ScheduleSettings::lateGrace()) {
            return;
        }

        $employee = Employee::find($employeeId);
        if (! $employee) {
            return;
        }

        $hrAdmins = User::whereHas('role', fn ($q) => $q->whereIn('name', ['admin', 'hr']))->get();

        foreach ($hrAdmins as $admin) {
            $admin->notify(new LateCheckIn(
                employee: $employee,
                checkedInAt: $checkedInAt->format('H:i'),
                scheduledStart: $plan['start'],
                lateMinutes: $lateMinutes,
                date: $date,
            ));
        }
    }
}
