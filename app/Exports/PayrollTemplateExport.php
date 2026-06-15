<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PayrollTemplateExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $entries) {}

    public function collection(): Collection
    {
        return $this->entries;
    }

    public function headings(): array
    {
        return [
            'id', 'Ажилтны нэр', 'Ажилтны дугаар',
            'Үндсэн цалин', 'НД цалин', 'Урьд олгосон', 'Баярын урьд',
            'А.Т.Х 40%', 'Илүү цаг 10%', 'Ээлж.амр+хувь',
            'Ажлын өдөр', 'Ажилласан', '1 өдрийн цалин',
            'Хоол', 'Унаа', 'Сүү',
            'Нийт нэмэгдэл', 'Тооцсон цалин', 'НД цалин нийт', 'НДШ 11.5%',
            'Хоцролт', 'Хуруу', 'Суутгал',
            'ХХОАТ', 'Гарт олгох', 'Банкаар олгох',
        ];
    }

    public function map($e): array
    {
        return [
            $e->id, $e->employee->full_name, $e->employee->employee_number,
            (float) ($e->basic_salary ?: 0), (float) ($e->nd_salary ?: 0),
            (float) ($e->prev_paid ?: 0), (float) ($e->holiday_advance ?: 0),
            (float) ($e->ath_bonus ?: 0), (float) ($e->overtime_bonus ?: 0), (float) ($e->vacation_pay ?: 0),
            (float) ($e->working_days ?: 0), (float) ($e->worked_days ?: 0), (float) ($e->daily_rate ?: 0),
            (float) ($e->food ?: 0), (float) ($e->transport ?: 0), (float) ($e->milk ?: 0),
            (float) ($e->total_bonus ?: 0), (float) ($e->calc_salary ?: 0), (float) ($e->nd_total ?: 0), (float) ($e->ndsh ?: 0),
            (float) ($e->tardiness ?: 0), (float) ($e->no_fingerprint ?: 0), (float) ($e->other_deduction ?: 0),
            (float) ($e->income_tax ?: 0), (float) ($e->net_hand ?: 0), (float) ($e->bank_salary ?: 0),
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
}
