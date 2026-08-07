<?php

namespace App\Exports;

use App\Support\Payroll\Formula;
use App\Support\Payroll\PayrollSchema;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Цалингийн эцсийн тайлан — эхэн/сүүл тус тусын баганатай.
 *
 * Томьёо нь Excel дотроо амьд үлдэнэ: нягтлан ямар нэг тоог засахад
 * тооцоо нь дагаж шинэчлэгдэнэ.  Доод талд =SUM() нийлбэр мөр байна.
 */
class PayrollExport implements FromArray, ShouldAutoSize, WithEvents, WithHeadings, WithTitle
{
    /** A=Овог нэр, B=Регистр, C=Ажил → өгөгдөл D-ээс эхэлнэ */
    private const DATA_START = 4;

    private readonly array $columns;

    private readonly array $letters;

    private readonly string $bankColumn;

    public function __construct(private readonly Collection $entries, private readonly string $half)
    {
        $this->columns = PayrollSchema::columns($half);
        $this->letters = PayrollSchema::excelLetters($half, self::DATA_START);
        $this->bankColumn = Coordinate::stringFromColumnIndex(self::DATA_START + count($this->columns));
    }

    public function title(): string
    {
        return $this->half === 'first' ? 'Эхэн цалин' : 'Сүүл цалин';
    }

    public function headings(): array
    {
        return array_merge(
            ['Овог нэр', 'Регистр', 'Ажил'],
            array_map(fn ($c) => $c['label'], $this->columns),
            ['Данс']
        );
    }

    public function array(): array
    {
        $rows = [];
        $rowNumber = 1;

        foreach ($this->entries as $entry) {
            $rowNumber++;

            $line = [$entry['name'], $entry['register_number'], $entry['position']];

            foreach ($this->columns as $col) {
                $line[] = $col['formula'] !== null
                    ? Formula::toExcel($col['formula'], $this->letters, $rowNumber)
                    : (float) ($entry[$col['key']] ?? 0);
            }

            $line[] = $entry['bank_account'];
            $rows[] = $line;
        }

        return $rows;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                $count = $this->entries->count();
                $lastRow = $count + 1;
                $totalRow = $lastRow + 1;

                $sheet->getStyle("A1:{$this->bankColumn}1")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E293B']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(42);

                if ($count === 0) {
                    return;
                }

                foreach ($this->columns as $col) {
                    $letter = $this->letters[$col['key']];

                    $sheet->getStyle("{$letter}2:{$letter}{$lastRow}")
                        ->getNumberFormat()->setFormatCode($col['int'] ? '#,##0' : '#,##0.##');

                    if ($col['highlight']) {
                        $sheet->getStyle("{$letter}2:{$letter}{$lastRow}")->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFECFDF5']],
                        ]);
                    }
                }

                // ── Нийлбэр мөр (=SUM томьёотой) ──────────────────────────────
                $sheet->setCellValue("A{$totalRow}", 'Нийт');

                foreach ($this->columns as $col) {
                    if (! $col['sum']) {
                        continue;
                    }

                    $letter = $this->letters[$col['key']];
                    $sheet->setCellValue("{$letter}{$totalRow}", "=SUM({$letter}2:{$letter}{$lastRow})");
                    $sheet->getStyle("{$letter}{$totalRow}")
                        ->getNumberFormat()->setFormatCode($col['int'] ? '#,##0' : '#,##0.##');
                }

                $sheet->getStyle("A{$totalRow}:{$this->bankColumn}{$totalRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF1F5F9']],
                    'borders' => ['top' => ['borderStyle' => 'thin']],
                ]);

                $sheet->freezePane('D2');
            },
        ];
    }
}
