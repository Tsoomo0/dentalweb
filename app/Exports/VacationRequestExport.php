<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class VacationRequestExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $requests) {}

    public function collection(): Collection
    {
        return $this->requests;
    }

    public function headings(): array
    {
        return [
            'Ажилтан',
            'Ажилтны дугаар',
            'Албан тушаал',
            'Салбар',
            'Эхлэх огноо',
            'Дуусах огноо',
            'Нийт хоног',
            'Орлох ажилтан',
            'Байршил',
            'Яаралтай утас',
            'Энэ жил авсан',
            'Шалтгаан',
            'Статус',
            'Шийдвэрлэсэн',
            'Илгээсэн огноо',
        ];
    }

    public function map($request): array
    {
        if ($request->isApproved()) {
            $status = 'Зөвшөөрсөн';
        } elseif ($request->isRejected()) {
            $status = 'Цуцалсан';
        } else {
            $status = 'Хүлээгдэж байна';
        }

        return [
            $request->employee->full_name,
            $request->employee->employee_number ?? '—',
            $request->employee->position?->name ?? '—',
            $request->employee->branch?->name ?? '—',
            $request->start_date->format('Y-m-d'),
            $request->end_date->format('Y-m-d'),
            $request->days,
            $request->replacement?->full_name ?? '—',
            $request->location_during_leave ?? '—',
            $request->emergency_phone ?? '—',
            $request->had_annual_leave_this_year ? 'Тийм' : 'Үгүй',
            $request->reason ?? '—',
            $status,
            $request->reviewer?->name ?? '—',
            $request->created_at->format('Y-m-d'),
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
