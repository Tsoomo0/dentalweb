<?php

namespace App\Services\Attendance;

use App\Models\Branch;
use App\Models\HR\AttendanceLog;
use App\Models\HR\AttendancePunch;
use App\Models\HR\Employee;
use App\Models\HR\Shift;
use App\Services\Schedule\LeaveCalendar;
use App\Services\Schedule\RosterLookup;
use Carbon\CarbonPeriod;

/**
 * Ирцийн хуудас ба Excel-д: өдөр бүрийн мөр (ирц + хуваарьтай харьцуулалт,
 * хуваарьтай боловч ирээгүй өдрүүд) болон ажилтан бүрийн сарын нэгтгэл.
 */
final class AttendanceReport
{
    public function __construct(
        private readonly string $from,
        private readonly string $to,
        private readonly ?int $branchId = null,
        private readonly ?int $employeeId = null,
    ) {}

    /** @return array{rows: list<array<string, mixed>>, summary: list<array<string, mixed>>} */
    public function build(): array
    {
        // Салбараар шүүхэд үндсэн салбараас гадна эмчийн «Мөн ажилладаг салбарууд»,
        // тэр салбарт хуваарьтай эсвэл тэнд хуруу дарсан хүмүүсийг ч оруулна.
        $memberIds = $this->branchId ? $this->branchMemberIds() : null;

        $logs = AttendanceLog::with('employee.position')
            ->whereBetween('date', [$this->from, $this->to])
            ->when($this->employeeId, fn ($q) => $q->where('employee_id', $this->employeeId))
            ->when($memberIds !== null, fn ($q) => $q->whereIn('employee_id', $memberIds))
            ->get()
            ->filter(fn (AttendanceLog $l) => $l->employee !== null);

        $employees = Employee::with('position')->where('status', 'active')
            ->when($this->employeeId, fn ($q) => $q->whereKey($this->employeeId))
            ->when($memberIds !== null, fn ($q) => $q->whereIn('id', $memberIds))
            ->get()
            ->concat($logs->pluck('employee'))
            ->unique('id')
            ->keyBy('id');

        $ids = $employees->keys();
        $plans = RosterLookup::plans($ids, $this->from, $this->to);
        $leaves = LeaveCalendar::days($ids, $this->from, $this->to);
        $evaluator = AttendanceEvaluator::make();
        $today = today()->toDateString();
        $logIndex = $logs->keyBy(fn (AttendanceLog $l) => $l->employee_id.'|'.$l->date->toDateString());
        $punchBranches = $this->punchBranches($ids);
        $branchNames = Branch::pluck('name', 'id');

        $rows = [];
        $summary = [];

        foreach ($employees as $employee) {
            $s = [
                'employee_id' => $employee->id, 'employee_name' => $employee->short_name,
                'full_name' => $employee->full_name, 'position' => $employee->position?->name,
                'photo_url' => $employee->photo_url,
                'planned_days' => 0, 'planned_minutes' => 0, 'worked_days' => 0, 'worked_minutes' => 0,
                'late_count' => 0, 'late_minutes' => 0, 'early_count' => 0, 'early_minutes' => 0,
                'overtime_minutes' => 0, 'absent_days' => 0, 'leave_days' => 0, 'unscheduled_days' => 0,
                'no_checkout' => 0,
            ];

            foreach (CarbonPeriod::create($this->from, $this->to) as $day) {
                $date = $day->toDateString();
                $plan = $plans[$employee->id][$date] ?? null;
                $log = $logIndex->get($employee->id.'|'.$date);
                $leave = $leaves[$employee->id][$date] ?? null;
                $punchedAt = $punchBranches[$employee->id.'|'.$date] ?? [];

                // Өөр салбарын ажилтан энэ салбарт зөвхөн хуваарьтай/хуруу дарсан өдрөөрөө тооцогдоно.
                if ($this->branchId && (int) $employee->branch_id !== $this->branchId
                    && ! in_array($this->branchId, array_map('intval', $plan['branch_ids'] ?? []), true)
                    && ! in_array($this->branchId, $punchedAt, true)) {
                    continue;
                }

                if ($plan && $plan['work']) {
                    $s['planned_days']++;
                    $s['planned_minutes'] += $plan['minutes'];
                }
                if ($date > $today) {
                    continue;
                }

                $r = $evaluator->evaluate($date, $log, $plan, $leave);
                if ($r['status'] === null) {
                    continue;
                }

                if ($log?->checked_in_at) {
                    $s['worked_days']++;
                    $s['worked_minutes'] += $r['worked'];
                }
                $s['late_count'] += $r['late'] > 0 ? 1 : 0;
                $s['late_minutes'] += $r['late'];
                $s['early_count'] += $r['early'] > 0 ? 1 : 0;
                $s['early_minutes'] += $r['early'];
                $s['overtime_minutes'] += $r['overtime'];
                $s['absent_days'] += $r['status'] === 'absent' ? 1 : 0;
                $s['leave_days'] += $r['status'] === 'leave' ? 1 : 0;
                $s['unscheduled_days'] += $r['status'] === 'unscheduled' ? 1 : 0;
                $s['no_checkout'] += $r['no_checkout'] ? 1 : 0;

                // Чөлөөтэй/хүлээгдэж буй өдрийг өдрийн жагсаалтад гаргахгүй — ирсэн эсвэл ирээгүйг л харуулна.
                if (! $log && ! in_array($r['status'], ['absent', 'missing'], true)) {
                    continue;
                }

                // Үндсэн салбараасаа өөр газар хуруу дарсан бол хаана ажилласныг харуулна.
                $elsewhere = array_values(array_filter($punchedAt, fn ($b) => $b !== (int) $employee->branch_id));
                $row = $this->row($employee, $date, $log, $plan, $r, $date === $today);
                $row['branches'] = array_values(array_map(fn ($b) => $branchNames[$b] ?? '', $elsewhere));
                $rows[] = $row;
            }

            if ($s['planned_days'] || $s['worked_days'] || $s['leave_days']) {
                $summary[] = $s;
            }
        }

        usort($rows, fn ($a, $b) => [$b['date'], $a['checked_in_at'] === null ? 1 : 0, $a['checked_in_at'] ?? '', $a['employee_name']]
            <=> [$a['date'], $b['checked_in_at'] === null ? 1 : 0, $b['checked_in_at'] ?? '', $b['employee_name']]);
        usort($summary, fn ($a, $b) => strcmp($a['employee_name'], $b['employee_name']));

        return ['rows' => $rows, 'summary' => $summary];
    }

    /**
     * Тухайн салбарт хамаарах ажилтнууд: үндсэн салбар, эмчийн нэмэлт салбар,
     * энэ хугацаанд тэнд хуваарьтай эсвэл тэндхийн төхөөрөмж дээр хуруу дарсан.
     *
     * @return list<int>
     */
    private function branchMemberIds(): array
    {
        $branchId = $this->branchId;

        $ids = Employee::where('branch_id', $branchId)
            ->orWhereHas('doctor.branches', fn ($q) => $q->where('branches.id', $branchId))
            ->pluck('id');

        $scheduled = Shift::published()
            ->where('branch_id', $branchId)
            ->whereBetween('date', [$this->from, $this->to])
            ->pluck('employee_id');

        $punched = AttendancePunch::query()
            ->join('attendance_devices', 'attendance_devices.id', '=', 'attendance_punches.attendance_device_id')
            ->where('attendance_devices.branch_id', $branchId)
            ->whereNotNull('attendance_punches.employee_id')
            ->whereBetween('attendance_punches.punched_at', ["{$this->from} 00:00:00", "{$this->to} 23:59:59"])
            ->distinct()
            ->pluck('attendance_punches.employee_id');

        return $ids->concat($scheduled)->concat($punched)->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    /**
     * Ажилтан бүр өдөр бүр аль салбарын төхөөрөмж дээр хуруу дарсан.
     *
     * @return array<string, list<int>> "employee_id|Y-m-d" => [branch_id, ...]
     */
    private function punchBranches(iterable $employeeIds): array
    {
        $out = [];

        AttendancePunch::query()
            ->join('attendance_devices', 'attendance_devices.id', '=', 'attendance_punches.attendance_device_id')
            ->whereIn('attendance_punches.employee_id', collect($employeeIds)->all())
            ->whereNotNull('attendance_devices.branch_id')
            ->whereBetween('attendance_punches.punched_at', ["{$this->from} 00:00:00", "{$this->to} 23:59:59"])
            ->selectRaw('attendance_punches.employee_id as e, DATE(attendance_punches.punched_at) as d, attendance_devices.branch_id as b')
            ->distinct()
            ->toBase()
            ->get()
            ->each(function ($r) use (&$out) {
                $out[$r->e.'|'.substr((string) $r->d, 0, 10)][] = (int) $r->b;
            });

        return $out;
    }

    private function row(Employee $employee, string $date, ?AttendanceLog $log, ?array $plan, array $r, bool $isToday): array
    {
        return [
            'id' => $log?->id,
            'key' => $log ? "l{$log->id}" : "a{$employee->id}-{$date}",
            'date' => $date,
            'is_today' => $isToday,
            'employee_id' => $employee->id,
            'employee_name' => $employee->short_name,
            'full_name' => $employee->full_name,
            'photo_url' => $employee->photo_url,
            'position' => $employee->position?->name,
            'checked_in_at' => $log?->checked_in_at?->format('H:i'),
            'checked_out_at' => $log?->checked_out_at?->format('H:i'),
            'check_in_source' => $log?->check_in_source,
            'check_out_source' => $log?->check_out_source,
            'worked_minutes' => $r['worked'],
            'scheduled_start' => $plan && $plan['work'] ? $plan['start'] : null,
            'scheduled_end' => $plan && $plan['work'] ? $plan['end'] : null,
            'scheduled_minutes' => $r['scheduled'],
            'shift_label' => $plan ? $plan['label'] : null,
            'late_minutes' => $r['late'] ?: null,
            'early_leave_minutes' => $r['early'] ?: null,
            'overtime_minutes' => $r['overtime'] ?: null,
            'status' => $r['status'],
            'no_checkout' => $r['no_checkout'],
        ];
    }
}
