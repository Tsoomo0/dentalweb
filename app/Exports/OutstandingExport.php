<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class OutstandingExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $entries) {}

    public function collection(): Collection
    {
        return $this->entries;
    }

    public function headings(): array
    {
        return [
            'Огноо', 'Салбар', 'Үйлчлүүлэгч', 'Оношилгоо', 'Баримт №',
            'Дутуу дүн', 'Эмч', 'Ресепшн', 'Статус',
            'Төлсөн дүн', 'Хэлбэр', 'Баримтын дугаар', 'Төлсөн огноо',
        ];
    }

    public function map($e): array
    {
        return [
            $e->dailySheet->date->format('Y-m-d'),
            $e->dailySheet->branch?->name ?? '',
            $e->patient_name ?? '',
            $e->diagnosis ?? '',
            $e->appointment_number ?? '',
            $e->outstanding_amount !== null ? (float) $e->outstanding_amount : '',
            $e->doctor?->name ?? '',
            $e->user?->name ?? '',
            $e->outstanding_paid_at ? 'Төлөгдсөн' : 'Дутуу',
            $e->outstanding_paid_amount !== null ? (float) $e->outstanding_paid_amount : '',
            $e->outstanding_paid_method ?? '',
            $e->outstanding_paid_receipt ?? '',
            $e->outstanding_paid_at?->format('Y-m-d') ?? '',
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
