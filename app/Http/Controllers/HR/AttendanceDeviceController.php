<?php

namespace App\Http\Controllers\HR;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\HR\AttendanceDevice;
use App\Models\HR\AttendanceDeviceUser;
use App\Models\HR\AttendancePunch;
use App\Models\HR\Employee;
use App\Services\Attendance\AttendanceIngestService;
use App\Services\Attendance\DeviceUserMatcher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Хурууны хээний ирцийн төхөөрөмжүүд: бүртгэх, холболтын төрөл (4370 / push),
 * агентын токен, PIN ↔ ажилтан тааруулах, USB .dat файл оруулах.
 */
class AttendanceDeviceController extends Controller
{
    public function __construct(
        private readonly AttendanceIngestService $attendance,
        private readonly DeviceUserMatcher $matcher,
    ) {}

    public function index(): Response
    {
        $today = now()->toDateString();

        $devices = AttendanceDevice::with('branch:id,name')
            ->withCount([
                'users as unmapped_count' => fn ($q) => $q->whereNull('employee_id')->whereNull('hidden_at'),
                'punches as today_count' => fn ($q) => $q->whereBetween('punched_at', ["{$today} 00:00:00", "{$today} 23:59:59"]),
            ])
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn (AttendanceDevice $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'branch_id' => $d->branch_id,
                'branch_name' => $d->branch?->name,
                'connection_type' => $d->connection_type,
                'serial_number' => $d->serial_number,
                'model' => $d->model,
                'firmware' => $d->firmware,
                'ip_address' => $d->ip_address,
                'port' => $d->port,
                'comm_key' => $d->comm_key,
                'is_active' => $d->is_active,
                'has_token' => $d->getRawOriginal('api_token_hash') !== null,
                'online' => $d->isOnline(),
                'last_seen_at' => $d->last_seen_at?->format('Y-m-d H:i'),
                'last_ip' => $d->last_ip,
                'last_punch_at' => $d->last_punch_at?->format('Y-m-d H:i'),
                'clock_drift_seconds' => $d->clock_drift_seconds,
                'records_count' => $d->records_count,
                'records_capacity' => $d->records_capacity,
                'storage_percent' => $d->storagePercent(),
                'unmapped_count' => $d->unmapped_count,
                'today_count' => $d->today_count,
                'notes' => $d->notes,
            ]);

        // Тааруулалт (device, pin) хоёр баганаар холбогддог тул тоог тусад нь бүлэглэж авна.
        // Сүүлийн бүртгэлийн огноогоор HR одоо ажиллаж буй хүн, гарсан хүнийг ялгана.
        $punchStats = AttendancePunch::whereNotNull('attendance_device_id')
            ->selectRaw('attendance_device_id, device_user_pin, COUNT(*) as c, MAX(punched_at) as last_at')
            ->groupBy('attendance_device_id', 'device_user_pin')
            ->toBase()
            ->get()
            ->keyBy(fn ($r) => "{$r->attendance_device_id}|{$r->device_user_pin}");

        $users = AttendanceDeviceUser::with(['device:id,name,branch_id', 'employee:id,first_name,last_name,employee_number'])
            ->orderByRaw('employee_id IS NOT NULL')
            ->orderBy('attendance_device_id')
            ->orderByRaw('LENGTH(device_user_pin)')
            ->orderBy('device_user_pin')
            ->get();

        // Эмчийн «Мөн ажилладаг салбарууд»-ыг ч тооцно — нэг хүн хоёр салбарын төхөөрөмж дээр байж болно.
        $employees = Employee::with('doctor.branches:id')->where('status', 'active')->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'employee_number', 'branch_id']);
        $employeeLabels = $employees->mapWithKeys(fn ($e) => [$e->id => "{$e->full_name} ({$e->employee_number})"]);

        // Төхөөрөмж дээрх нэрээр санал — PIN системийн дугаартай зөрдөг тул HR баталгаажуулна.
        $mappedByDevice = $users->whereNotNull('employee_id')
            ->groupBy('attendance_device_id')
            ->map(fn ($rows) => $rows->pluck('employee_id')->all())
            ->all();
        $suggestions = $this->matcher->suggest($users->whereNull('employee_id')->whereNull('hidden_at'), $employees, $mappedByDevice);

        $deviceUsers = $users->map(function (AttendanceDeviceUser $u) use ($punchStats, $suggestions, $employeeLabels) {
            $stats = $punchStats["{$u->attendance_device_id}|{$u->device_user_pin}"] ?? null;

            return [
                'id' => $u->id,
                'device_id' => $u->attendance_device_id,
                'device_name' => $u->device?->name,
                'device_branch_id' => $u->device?->branch_id,
                'pin' => $u->device_user_pin,
                'name' => $u->name,
                'employee_id' => $u->employee_id,
                'employee_name' => $u->employee ? "{$u->employee->full_name} ({$u->employee->employee_number})" : null,
                'hidden' => $u->hidden_at !== null,
                'punches_count' => (int) ($stats->c ?? 0),
                'last_punch_at' => $stats?->last_at ? substr((string) $stats->last_at, 0, 10) : null,
                'suggestion' => isset($suggestions[$u->id])
                    ? ['employee_id' => $suggestions[$u->id], 'employee_name' => $employeeLabels[$suggestions[$u->id]] ?? null]
                    : null,
            ];
        });

        $appUrl = parse_url((string) config('app.url'));

        return Inertia::render('hr/attendance/devices', [
            'devices' => $devices,
            'deviceUsers' => $deviceUsers,
            'employees' => $employees->map(fn ($e) => ['id' => $e->id, 'name' => $employeeLabels[$e->id], 'branch_ids' => $e->workBranchIds()]),
            'branches' => Branch::orderBy('order')->get(['id', 'name']),
            'server' => [
                'ingest_url' => url('/api/attendance/ingest'),
                'push_host' => $appUrl['host'] ?? request()->getHost(),
                'push_port' => 80,
            ],
            'newToken' => session('attendance_device_token'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $device = AttendanceDevice::create($this->validated($request));

        if ($device->isPull()) {
            return $this->withToken($device, "«{$device->name}» нэмэгдлээ. Агентын токеныг хуулж авна уу — дахин харагдахгүй.");
        }

        return back()->with('success', "«{$device->name}» нэмэгдлээ.");
    }

    public function update(Request $request, AttendanceDevice $device): RedirectResponse
    {
        $device->update($this->validated($request, $device));

        return back()->with('success', 'Төхөөрөмжийн тохиргоо хадгалагдлаа.');
    }

    public function destroy(AttendanceDevice $device): RedirectResponse
    {
        // Ирцийн бүртгэл автоматаар устахгүй байх ёстой — бүртгэлтэй бол идэвхгүй болгоно.
        if ($device->punches()->exists()) {
            return back()->with('error', 'Энэ төхөөрөмжөөс ирсэн бүртгэл байгаа тул устгах боломжгүй. Идэвхгүй болгоно уу.');
        }

        $device->delete();

        return back()->with('success', 'Төхөөрөмж устгагдлаа.');
    }

    public function regenerateToken(AttendanceDevice $device): RedirectResponse
    {
        if (! $device->isPull()) {
            return back()->with('error', 'Токен зөвхөн 4370 (агент) төрлийн төхөөрөмжид хэрэгтэй.');
        }

        return $this->withToken($device, 'Шинэ токен үүслээ. Хуучин токентой агент ажиллахаа болино.');
    }

    public function mapUser(Request $request, AttendanceDeviceUser $deviceUser): RedirectResponse
    {
        $data = $request->validate([
            'employee_id' => ['nullable', 'integer', Rule::exists('employees', 'id')],
        ]);

        $this->attendance->assignEmployee($deviceUser, $data['employee_id'] ?? null);

        return back()->with('success', $data['employee_id'] ?? null
            ? "PIN {$deviceUser->device_user_pin} тааруулагдаж, бүртгэлүүд нь ирцэд орлоо."
            : "PIN {$deviceUser->device_user_pin}-ийн тааруулалт цуцлагдлаа.");
    }

    /**
     * Нэрээр гаргасан саналуудыг HR нэг дор баталгаажуулна.
     */
    public function bulkMap(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'mappings' => 'required|array|min:1|max:500',
            'mappings.*.id' => ['required', 'integer', Rule::exists('attendance_device_users', 'id')],
            'mappings.*.employee_id' => ['required', 'integer', Rule::exists('employees', 'id')],
        ]);

        $deviceUsers = AttendanceDeviceUser::whereIn('id', array_column($data['mappings'], 'id'))->get()->keyBy('id');

        foreach ($data['mappings'] as $mapping) {
            $this->attendance->assignEmployee($deviceUsers[$mapping['id']], (int) $mapping['employee_id']);
        }

        return back()->with('success', count($data['mappings']).' PIN ажилтантай тааруулагдлаа.');
    }

    /**
     * Тааруулахгүй PIN-үүдийг (гарсан ажилтан, туршилтын хэрэглэгч) нуух эсвэл сэргээх.
     * Бүртгэлүүд нь устахгүй — зөвхөн жагсаалт, тоолуураас гарна.
     */
    public function hideUsers(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1|max:2000',
            'ids.*' => 'integer',
            'hidden' => 'required|boolean',
        ]);

        // Тааруулсан PIN-ийг нуувал ирц нь харагдахгүй алга болно — зөвхөн тааруулаагүйг.
        $count = AttendanceDeviceUser::whereIn('id', $data['ids'])
            ->whereNull('employee_id')
            ->update(['hidden_at' => $data['hidden'] ? now() : null]);

        return back()->with('success', $data['hidden'] ? "{$count} PIN нуугдлаа." : "{$count} PIN сэргээгдлээ.");
    }

    /**
     * USB flash-аар татсан attlog .dat файл — сүлжээгүй үеийн нөөц арга.
     * Мөр бүрээс эхний талбарыг PIN, "YYYY-MM-DD HH:MM:SS" хэлбэрийн огноог цаг гэж авна.
     */
    public function importUsb(Request $request, AttendanceDevice $device): RedirectResponse
    {
        $request->validate([
            'file' => 'required|file|max:20480',
        ]);

        $punches = [];
        $handle = fopen($request->file('file')->getRealPath(), 'r');

        while (($line = fgets($handle)) !== false) {
            if (preg_match('/^\s*(\S+)\s+(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/', $line, $m)) {
                $punches[] = ['pin' => $m[1], 'punched_at' => preg_replace('/\s+/', ' ', $m[2])];
            }
        }

        fclose($handle);

        if ($punches === []) {
            return back()->with('error', 'Файлаас ирцийн мөр олдсонгүй. Төхөөрөмжийн USB-ээр татсан attlog .dat файл эсэхийг шалгана уу.');
        }

        $result = $this->attendance->ingestDevicePunches($device, $punches, AttendancePunch::SOURCE_USB, notify: false);

        return back()->with('success', "Файлаас {$result['accepted']} шинэ бүртгэл орлоо ({$result['duplicates']} нь өмнө нь орсон байсан).");
    }

    private function withToken(AttendanceDevice $device, string $message): RedirectResponse
    {
        $token = $device->issueApiToken();

        return back()
            ->with('success', $message)
            ->with('attendance_device_token', ['device_id' => $device->id, 'token' => $token]);
    }

    private function validated(Request $request, ?AttendanceDevice $device = null): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')],
            'connection_type' => ['required', Rule::in([AttendanceDevice::TYPE_PULL, AttendanceDevice::TYPE_PUSH])],
            'serial_number' => [
                Rule::requiredIf($request->input('connection_type') === AttendanceDevice::TYPE_PUSH),
                'nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('attendance_devices', 'serial_number')->ignore($device?->id),
            ],
            'model' => 'nullable|string|max:64',
            'ip_address' => ['nullable', 'ip', Rule::requiredIf($request->input('connection_type') === AttendanceDevice::TYPE_PULL)],
            'port' => 'nullable|integer|between:1,65535',
            'comm_key' => 'nullable|integer|between:0,999999',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:1000',
        ], [
            'serial_number.required' => 'Push төхөөрөмжийг serial дугаараар нь таньдаг тул заавал бөглөнө.',
            'serial_number.unique' => 'Энэ serial дугаартай төхөөрөмж аль хэдийн бүртгэлтэй байна.',
            'ip_address.required' => '4370 төхөөрөмжийн IP хаягийг агент ашиглана.',
        ]);

        $data['port'] ??= 4370;
        $data['comm_key'] ??= 0;
        $data['is_active'] = $request->boolean('is_active', true);

        return $data;
    }
}
