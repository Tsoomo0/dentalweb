<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceExport implements FromCollection, ShouldAutoSize, WithEvents, WithHeadings, WithMapping, WithStyles
{
    private int $rowNumber = 0;

    public function __construct(private Collection $logs) {}

    public function collection(): Collection
    {
        return $this->logs;
    }

    public function headings(): array
    {
        return [
            '№',
            'Огноо',
            'Ажилтан',
            'Албан тушаал',
            'Ирсэн цаг',
            'Тарсан цаг',
            'Ажилласан цаг',
            'Статус',
        ];
    }

    public function map($log): array
    {
        $this->rowNumber++;

        if ($log->checked_in_at && $log->checked_out_at) {
            $statusLabel = 'Дууссан';
        } elseif ($log->checked_in_at) {
            $statusLabel = 'Ажиллаж байна';
        } else {
            $statusLabel = '—';
        }

        $workedH = intdiv($log->worked_minutes, 60);
        $workedM = $log->worked_minutes % 60;
        $workedLabel = $log->worked_minutes > 0 ? "{$workedH}ц {$workedM}мин" : '—';

        return [
            $this->rowNumber,
            $log->date->format('Y-m-d'),
            $log->employee->full_name,
            $log->employee->position?->name ?? '—',
            $log->checked_in_at ? $log->checked_in_at->format('H:i') : '—',
            $log->checked_out_at ? $log->checked_out_at->format('H:i') : '—',
            $workedLabel,
            $statusLabel,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF1E293B']],
                'alignment' => ['horizontal' => 'center'],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $totalMins = $this->logs->sum('worked_minutes');
                $totalH = intdiv($totalMins, 60);
                $totalM = $totalMins % 60;

                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow() + 1;

                $sheet->setCellValue("A{$lastRow}", 'Нийт ажилласан цаг');
                $sheet->mergeCells("A{$lastRow}:F{$lastRow}");
                $sheet->setCellValue("G{$lastRow}", "{$totalH}ц {$totalM}мин");

                $sheet->getStyle("A{$lastRow}:H{$lastRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFF1F5F9']],
                ]);
            },
        ];
    }
}
