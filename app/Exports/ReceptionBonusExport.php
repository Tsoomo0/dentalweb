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

class ReceptionBonusExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles, WithEvents
{
    public function __construct(
        private Collection $entries,
        private $criteria,
        private $receptionBonusRun,
    ) {}

    public function collection(): Collection
    {
        return $this->entries;
    }

    public function headings(): array
    {
        $headings = [
            'Ажилтан',
            'Албан тушаал',
        ];

        foreach ($this->criteria as $c) {
            $headings[] = $c['label'].' ('.number_format($c['price']).'₮/'.$c['unit'].')';
        }

        $headings[] = 'Нийт ₮';

        return $headings;
    }

    public function map($entry): array
    {
        $row = [
            $entry['name'],
            $entry['position'] ?? '',
        ];

        foreach ($this->criteria as $key => $c) {
            $row[] = $entry[$key] ?: '';
        }

        $row[] = $entry['total_amount'] ? (float) $entry['total_amount'] : '';

        return $row;
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
                $sheet = $event->sheet->getDelegate();

                // 1 header row + entries
                $totalRow = $this->entries->count() + 2;
                $colCount = 3 + count($this->criteria); // name, position, criteria..., total

                // "Нийт" label in first column
                $sheet->setCellValueByColumnAndRow(1, $totalRow, 'Нийт');

                // Criteria sums (start at column 3)
                $col = 3;
                foreach ($this->criteria as $key => $c) {
                    $sum = $this->entries->sum($key);
                    $sheet->setCellValueByColumnAndRow($col, $totalRow, $sum ?: '');
                    $col++;
                }

                // Total amount sum (last column)
                $sheet->setCellValueByColumnAndRow($colCount, $totalRow, (float) $this->entries->sum('total_amount'));

                $lastColLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colCount);
                $sheet->getStyle('A'.$totalRow.':'.$lastColLetter.$totalRow)->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFF1F5F9']],
                ]);
            },
        ];
    }
}
