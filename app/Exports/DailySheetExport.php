<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DailySheetExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $sheets, private ?string $doctorId = null) {}

    public function collection(): Collection
    {
        $rows = collect();

        foreach ($this->sheets as $sheet) {
            $entries = $sheet->entries;
            if ($this->doctorId) {
                $entries = $entries->filter(fn ($e) => $e->doctor_id == $this->doctorId);
            }

            foreach ($entries as $e) {
                $rows->push([
                    $sheet->date->format('Y-m-d'),
                    $sheet->branch?->name ?? '',
                    $e->patient_name ?? '',
                    $e->gender ?? '',
                    $e->diagnosis ?? '',
                    $e->appointment_number ?? '',
                    (float) $e->discount,
                    (float) $e->mobile_amount,
                    (float) $e->card_amount,
                    (float) $e->cash_amount,
                    (float) $e->storepay_amount,
                    (float) $e->total_amount,
                    (float) $e->outstanding_amount,
                    $e->doctor?->name ?? '',
                    $e->user?->name ?? '',
                ]);
            }
        }

        return $rows;
    }

    public function headings(): array
    {
        return [
            'Огноо', 'Салбар', 'Үйлчлүүлэгч', 'Хүйс', 'Оноош',
            'Захиалгын №', 'Хөнгөлөлт', 'Мобайл', 'Карт', 'Бэлэн',
            'Storepay', 'Нийт дүн', 'Дутуу', 'Эмч', 'Ресепшн',
        ];
    }

    public function map($row): array
    {
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
}
