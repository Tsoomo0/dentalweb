<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Дуудлагын хураангуй тайлан — Excel.
 *
 * Мөрүүд нь CallReportService-с ирдэг тул дэлгэц дээрх тоо болон татсан
 * файлын тоо хэзээ ч зөрөхгүй.
 */
class CallReportExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    /** @param  array<int,array<string,mixed>>  $rows */
    public function __construct(private array $rows) {}

    public function collection(): Collection
    {
        return collect($this->rows);
    }

    public function headings(): array
    {
        return [
            'Хугацаа',
            'Нийт',
            'Хариулсан',
            'Алдсан',
            'Шийдэгдээгүй',
            'Ажлын цагаас гадуур',
            'Спам',
            'Цаг захиалга болсон',
            'Хариулалт (%)',
            'Дундаж яриа',
        ];
    }

    /** @param  array<string,mixed>  $row */
    public function map($row): array
    {
        return [
            $row['period'],
            $row['total'],
            $row['answered'],
            $row['missed'],
            $row['unhandled'],
            $row['after_hours'],
            $row['spam'],
            $row['appointments'],
            $row['answer_rate'] ?? '—',
            $this->duration($row['avg_talk'] ?? null),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true]]];
    }

    private function duration(?int $seconds): string
    {
        if ($seconds === null) {
            return '—';
        }

        return floor($seconds / 60).':'.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT);
    }
}
