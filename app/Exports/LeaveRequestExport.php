<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LeaveRequestExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $requests) {}

    public function collection(): Collection
    {
        return $this->requests;
    }

    public function headings(): array
    {
        return [
            'Дугаар',
            'Ажилтан',
            'Тушаал',
            'Салбар',
            'Эхлэх',
            'Дуусах',
            'Өдөр',
            'Төрөл',
            'Шалтгаан',
            'Орлох',
            'Нөхөж ажиллах өдөр',
            'Нөхөх тайлбар',
            'Статус',
            'Шийдвэрлэсэн',
        ];
    }

    public function map($request): array
    {
        $leaveTypes = ['sick' => 'Өвчтэй', 'personal' => 'Хувийн'];
        $statusMap = ['pending' => 'Хүлээгдэж байна', 'approved' => 'Зөвшөөрсөн', 'rejected' => 'Цуцалсан'];

        $reviewer = $request->reviewer?->name ?? '—';
        $reviewedAt = $request->reviewed_at ? ' · '.$request->reviewed_at->format('Y-m-d') : '';

        return [
            $request->employee->employee_number,
            $request->employee->full_name,
            $request->employee->position?->name ?? '—',
            $request->employee->branch?->name ?? '—',
            $request->start_date->format('Y-m-d'),
            $request->end_date->format('Y-m-d'),
            $request->days,
            $leaveTypes[$request->leave_type] ?? $request->leave_type,
            $request->reason,
            $request->replacement?->full_name ?? '—',
            $request->makeup_date?->format('Y-m-d') ?? '—',
            $request->makeup_note ?? '—',
            $statusMap[$request->status] ?? $request->status,
            $reviewer.$reviewedAt,
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
