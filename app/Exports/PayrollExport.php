<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PayrollExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles, WithEvents
{
    public function __construct(private Collection $entries) {}

    public function collection(): Collection
    {
        return $this->entries;
    }

    public function headings(): array
    {
        return [
            'Овог нэр',
            'Регистр',
            'Ажил',
            'Банкаар олгосон (урьд)',
            'Баярын урьдчилгаа',
            'Үндсэн цалин',
            'НД цалин',
            'А.Т.Х 40%',
            'Илүү цаг 10%',
            'Ээлж.амр+хувь',
            'Ажлын өдөр',
            'Ажилласан өдөр',
            '1 өдрийн цалин',
            'Хоол',
            'Унаа',
            'Сүү',
            'Нийт нэмэгдэл',
            'Хоцролт',
            'Хуруу',
            'Суутгал',
            'Тооцсон цалин',
            'НД цалин (нийт)',
            'НДШ 11.5%',
            'ХХОАТ',
            'НДШ+ХХОАТ',
            'Гарт олгох',
            'Банкаар олгох',
            'Данс',
        ];
    }

    public function map($entry): array
    {
        return [
            $entry['name'],
            $entry['register_number'],
            $entry['position'],
            (float) $entry['prev_paid'],
            (float) $entry['holiday_advance'],
            (float) $entry['basic_salary'],
            (float) $entry['nd_salary'],
            (float) $entry['ath_bonus'],
            (float) $entry['overtime_bonus'],
            (float) $entry['vacation_pay'],
            (int) $entry['working_days'],
            (int) $entry['worked_days'],
            (float) $entry['daily_rate'],
            (float) $entry['food'],
            (float) $entry['transport'],
            (float) $entry['milk'],
            (float) $entry['total_bonus'],
            (float) $entry['tardiness'],
            (float) $entry['no_fingerprint'],
            (float) $entry['other_deduction'],
            (float) $entry['calc_salary'],
            (float) $entry['nd_total'],
            (float) $entry['ndsh'],
            (float) $entry['income_tax'],
            (float) ($entry['ndsh'] + $entry['income_tax']),
            (float) $entry['net_hand'],
            (float) $entry['bank_salary'],
            $entry['bank_account'],
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
                $sheet = $event->sheet->getDelegate();

                // header (1) + data rows + 1 = totals row
                $totalRow = $this->entries->count() + 2;

                $sum = fn (string $key) => (float) $this->entries->sum($key);

                $row = [
                    'Нийт',                                                        // A: name
                    '',                                                            // B: register
                    '',                                                            // C: position
                    $sum('prev_paid'),                                             // D
                    $sum('holiday_advance'),                                       // E
                    $sum('basic_salary'),                                          // F
                    null,                                                          // G: nd_salary (not totaled)
                    $sum('ath_bonus'),                                             // H
                    $sum('overtime_bonus'),                                        // I
                    $sum('vacation_pay'),                                          // J
                    null,                                                          // K: working_days
                    null,                                                          // L: worked_days
                    null,                                                          // M: daily_rate
                    $sum('food'),                                                  // N
                    $sum('transport'),                                            // O
                    $sum('milk'),                                                  // P
                    $sum('total_bonus'),                                           // Q
                    $sum('tardiness'),                                            // R
                    $sum('no_fingerprint'),                                       // S
                    $sum('other_deduction'),                                      // T
                    $sum('calc_salary'),                                          // U
                    $sum('nd_total'),                                             // V
                    $sum('ndsh'),                                                 // W
                    $sum('income_tax'),                                           // X
                    (float) $this->entries->sum(fn ($e) => $e['ndsh'] + $e['income_tax']), // Y
                    $sum('net_hand'),                                             // Z
                    $sum('bank_salary'),                                          // AA
                    null,                                                          // AB: bank_account
                ];

                $sheet->fromArray([$row], null, 'A'.$totalRow, true);

                $sheet->getStyle('A'.$totalRow.':AB'.$totalRow)->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFF1F5F9']],
                ]);
            },
        ];
    }
}
