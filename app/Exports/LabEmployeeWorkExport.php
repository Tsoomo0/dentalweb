<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Лаб ажилтны хийсэн ажлын экспорт.
 *
 * Багануудыг сонгосон бүлгээр нь угсардаг тул headings/rows-ыг
 * контроллероос бэлэн хэлбэрээр авна.
 */
class LabEmployeeWorkExport implements FromArray, ShouldAutoSize, WithEvents, WithHeadings, WithStyles, WithTitle
{
    public function __construct(
        private array $headings,
        private array $rows,
        private string $subtitle = '',
        private string $sheetTitle = 'Ажлын жагсаалт',
    ) {}

    public function array(): array
    {
        return $this->rows;
    }

    public function headings(): array
    {
        return $this->headings;
    }

    public function title(): string
    {
        return $this->sheetTitle;
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'      => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF1E293B']],
                'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet    = $event->sheet->getDelegate();
                $lastCol  = $sheet->getHighestColumn();
                $lastRow  = $sheet->getHighestRow();

                // Толгойн мөрийг хөлдөөж, урт жагсаалт гүйлгэхэд харагдана
                $sheet->freezePane('A2');
                $sheet->getRowDimension(1)->setRowHeight(22);

                // Хугацаа / шүүлтийн тайлбарыг доор нь тэмдэглэнэ
                if ($this->subtitle !== '') {
                    $row = $lastRow + 2;
                    $sheet->setCellValue('A'.$row, $this->subtitle);
                    $sheet->getStyle('A'.$row)->applyFromArray([
                        'font' => ['italic' => true, 'color' => ['argb' => 'FF64748B']],
                    ]);
                }

                if ($lastRow > 1) {
                    $sheet->getStyle('A1:'.$lastCol.$lastRow)->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => 'thin', 'color' => ['argb' => 'FFE2E8F0']]],
                    ]);
                }
            },
        ];
    }
}
