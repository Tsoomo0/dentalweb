<?php

namespace App\Services\Schedule;

use App\Models\HR\LeaveRequest;
use App\Models\HR\VacationRequest;
use Carbon\CarbonPeriod;

/**
 * Чөлөө (leave_requests) ба ээлжийн амралтыг (vacation_requests) өдөр бүрээр задална.
 * Хуваарь дээр давхарга болж харагдах, хэв маягаар бөглөхөд алгасах, ирцэд
 * "Ирээгүй" биш "Чөлөөтэй" гэж тооцоход хэрэглэнэ.
 */
final class LeaveCalendar
{
    public const LABELS = [
        'vacation' => 'Ээлжийн амралт',
        'sick' => 'Өвчний чөлөө',
        'personal' => 'Чөлөө',
    ];

    /**
     * @param  iterable<int>  $employeeIds
     * @return array<int, array<string, array{type: string, label: string, status: string}>> [employee][Y-m-d]
     */
    public static function days(iterable $employeeIds, string $from, string $to, bool $includePending = false): array
    {
        $ids = collect($employeeIds)->map(fn ($id) => (int) $id)->unique()->values()->all();
        if ($ids === []) {
            return [];
        }

        $statuses = $includePending ? ['approved', 'pending'] : ['approved'];
        $out = [];

        $put = function (int $employeeId, $start, $end, string $type, string $status) use (&$out, $from, $to) {
            $s = max($start->toDateString(), $from);
            $e = min($end->toDateString(), $to);
            if ($s > $e) {
                return;
            }

            foreach (CarbonPeriod::create($s, $e) as $day) {
                $key = $day->toDateString();
                // Батлагдсан нь хүлээгдэж буйгаас давуу
                if (isset($out[$employeeId][$key]) && $out[$employeeId][$key]['status'] === 'approved') {
                    continue;
                }
                $out[$employeeId][$key] = ['type' => $type, 'label' => self::LABELS[$type] ?? 'Чөлөө', 'status' => $status];
            }
        };

        LeaveRequest::whereIn('employee_id', $ids)->whereIn('status', $statuses)
            ->whereDate('start_date', '<=', $to)->whereDate('end_date', '>=', $from)
            ->get(['employee_id', 'start_date', 'end_date', 'leave_type', 'status'])
            ->each(fn ($r) => $put($r->employee_id, $r->start_date, $r->end_date, $r->leave_type === 'sick' ? 'sick' : 'personal', $r->status));

        VacationRequest::whereIn('employee_id', $ids)->whereIn('status', $statuses)
            ->whereDate('start_date', '<=', $to)->whereDate('end_date', '>=', $from)
            ->get(['employee_id', 'start_date', 'end_date', 'status'])
            ->each(fn ($r) => $put($r->employee_id, $r->start_date, $r->end_date, 'vacation', $r->status));

        return $out;
    }
}
