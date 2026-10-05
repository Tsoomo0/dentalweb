<?php

namespace App\Exports\Attendance;

use App\Services\Schedule\ShiftMath;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceDailySheet implements FromArray, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public const STATUS = [
        'on_time' => 'Цагтаа', 'late' => 'Хоцорсон', 'absent' => 'Ирээгүй', 'missing' => 'Ирээгүй байна',
        'unscheduled' => 'Хуваарьгүй', 'present' => 'Ирсэн', 'leave' => 'Чөлөөтэй',
    ];

    /** @param list<array<string, mixed>> $rows */
    public function __construct(private array $rows) {}

    public function title(): string
    {
        return 'Өдөр бүрээр';
    }

    public function headings(): array
    {
        return ['№', 'Огноо', 'Ажилтан', 'Албан тушаал', 'Хуваарь', 'Ирсэн', 'Тарсан',
            'Ажилласан', 'Хоцорсон', 'Эрт явсан', 'Илүү цаг', 'Төлөв'];
    }

    public function array(): array
    {
        $fmt = fn ($m) => $m ? ShiftMath::human((int) $m) : '';
        $out = [];

        foreach (array_reverse($this->rows) as $i => $r) {
            $out[] = [
                $i + 1,
                $r['date'],
                $r['full_name'],
                $r['position'] ?? '—',
                $r['scheduled_start'] ? "{$r['scheduled_start']}–{$r['scheduled_end']}" : ($r['shift_label'] ?? '—'),
                $r['checked_in_at'] ?? '—',
                $r['checked_out_at'] ?? ($r['no_checkout'] ? 'Тараагүй' : '—'),
                $fmt($r['worked_minutes']),
                $fmt($r['late_minutes']),
                $fmt($r['early_leave_minutes']),
                $fmt($r['overtime_minutes']),
                self::STATUS[$r['status']] ?? '',
            ];
        }

        return $out;
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => [
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF1E293B']],
            'alignment' => ['horizontal' => 'center'],
        ]];
    }
}
