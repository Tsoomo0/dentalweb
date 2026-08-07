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
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Import template — эхэн/сүүл цалин тус тусын баганатай, БОДИТ Excel томьёотой.
 *
 * Нягтлан зөвхөн цагаан (гар оролт) нүдийг бөглөнө; саарал нүд нь томьёогоор
 * өөрөө бодогдоно.  Буцааж import хийхэд систем гар оролтыг л уншиж,
 * томьёотой баганыг сервер дээр дахин бодно.
 */
class PayrollTemplateExport implements FromArray, ShouldAutoSize, WithEvents, WithHeadings, WithTitle
{
    private readonly array $columns;

    private readonly array $letters;

    public function __construct(private readonly Collection $entries, private readonly string $half)
    {
        $this->columns = PayrollSchema::columns($half);
        $this->letters = PayrollSchema::excelLetters($half);
    }

    public function title(): string
    {
        return $this->half === 'first' ? 'Эхэн цалин' : 'Сүүл цалин';
    }

    public function headings(): array
    {
        return PayrollSchema::headings($this->half);
    }

    public function array(): array
    {
        $rows = [];
        $rowNumber = 1;   // 1 = толгой мөр

        foreach ($this->entries as $entry) {
            $rowNumber++;

            $line = [$entry->id, $entry->employee->full_name, $entry->employee->employee_number];

            foreach ($this->columns as $col) {
                $line[] = $col['formula'] !== null
                    ? Formula::toExcel($col['formula'], $this->letters, $rowNumber)
                    : (float) ($entry->{$col['key']} ?: 0);
            }

            $rows[] = $line;
        }

        return $rows;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                $lastRow = $this->entries->count() + 1;
                $lastCol = $this->letters[array_key_last($this->letters)];

                // Толгой мөр
                $sheet->getStyle("A1:{$lastCol}1")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E293B']],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                ]);
                $sheet->getRowDimension(1)->setRowHeight(42);

                // Гар оролтгүй (томьёотой) баганыг саарлаар ялгаж, толгойд нь ƒ тэмдэг
                foreach ($this->columns as $col) {
                    $letter = $this->letters[$col['key']];

                    if ($col['formula'] === null) {
                        continue;
                    }

                    $sheet->setCellValue("{$letter}1", 'ƒ '.$col['label']);

                    if ($lastRow >= 2) {
                        $sheet->getStyle("{$letter}2:{$letter}{$lastRow}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF1F5F9']],
                            'font' => ['color' => ['argb' => 'FF64748B']],
                        ]);
                    }
                }

                if ($lastRow >= 2) {
                    // Мөнгөн дүнг мянгатаар тусгаарлана
                    foreach ($this->columns as $col) {
                        $letter = $this->letters[$col['key']];
                        $format = $col['int'] ? '#,##0' : '#,##0.##';
                        $sheet->getStyle("{$letter}2:{$letter}{$lastRow}")
                            ->getNumberFormat()->setFormatCode($format);
                    }

                    // id / нэр / дугаар — өөрчлөхгүй байхыг сануулж түгжинэ
                    $sheet->getStyle("A2:C{$lastRow}")->applyFromArray([
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFEF9C3']],
                    ]);
                }

                // Ажилтны нэр гүйлгэхэд хөдлөхгүй байх
                $sheet->freezePane('D2');
            },
        ];
    }
}
