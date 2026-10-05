<?php

namespace App\Exports\Attendance;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/** Ажилтан бүрийн сарын нэгтгэл — цагийг аравтын бутархай цагаар (цалин бодоход шууд хэрэглэнэ). */
class AttendanceSummarySheet implements FromArray, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    /** @param list<array<string, mixed>> $summary */
    public function __construct(private array $summary) {}

    public function title(): string
    {
        return 'Нэгтгэл';
    }

    public function headings(): array
    {
        return ['№', 'Ажилтан', 'Албан тушаал', 'Төлөвлөсөн өдөр', 'Төлөвлөсөн цаг', 'Ирсэн өдөр',
            'Ажилласан цаг', 'Хоцорсон (удаа)', 'Хоцорсон (мин)', 'Эрт явсан (удаа)', 'Эрт явсан (мин)',
            'Илүү цаг', 'Ирээгүй өдөр', 'Чөлөөтэй өдөр', 'Хуваарьгүй ажилласан', 'Тараагүй'];
    }

    public function array(): array
    {
        $h = fn (int $m) => round($m / 60, 2);

        return array_map(fn ($s, $i) => [
            $i + 1, $s['full_name'], $s['position'] ?? '—',
            $s['planned_days'], $h($s['planned_minutes']), $s['worked_days'], $h($s['worked_minutes']),
            $s['late_count'], $s['late_minutes'], $s['early_count'], $s['early_minutes'],
            $h($s['overtime_minutes']), $s['absent_days'], $s['leave_days'], $s['unscheduled_days'], $s['no_checkout'],
        ], $this->summary, array_keys($this->summary));
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => [
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF1E293B']],
            'alignment' => ['horizontal' => 'center', 'wrapText' => true],
        ]];
    }
}
