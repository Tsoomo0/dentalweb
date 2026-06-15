<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class JobApplicationExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $applications) {}

    public function collection(): Collection
    {
        return $this->applications;
    }

    public function headings(): array
    {
        return [
            'Огноо', 'Эцэг/эхийн нэр', 'Өөрийн нэр', 'Хүйс', 'Төрсөн огноо',
            'Регистр №', 'Гар утас', 'И-мэйл', 'Хаяг', 'Статус',
        ];
    }

    public function map($a): array
    {
        return [
            $a->created_at->format('Y.m.d'),
            $a->last_name,
            $a->first_name,
            $a->gender,
            $a->birth_date?->format('Y.m.d'),
            $a->register_no,
            $a->phone_mobile,
            $a->email,
            $a->address,
            $a->status_label,
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
