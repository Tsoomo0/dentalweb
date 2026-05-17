<?php

namespace App\Exports;

use App\Models\OrthoApplianceRecord;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class OrthoApplianceExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(
        private ?int $doctorId = null,
        private ?int $branchId = null,
    ) {}

    public function collection(): Collection
    {
        return OrthoApplianceRecord::with('doctor')
            ->when($this->doctorId, fn ($q) => $q->where('doctor_id', $this->doctorId))
            ->when($this->branchId && ! $this->doctorId, fn ($q) => $q->whereHas('doctor', fn ($d) => $d
                ->where(fn ($q2) => $q2
                    ->where('branch_id', $this->branchId)
                    ->orWhereHas('branches', fn ($q3) => $q3->where('branches.id', $this->branchId))
                )
            ))
            ->orderBy('doctor_id')
            ->orderBy('last_name')
            ->get();
    }

    public function headings(): array
    {
        return [
            'Эмч',
            'Аппарат төрөл',
            'Архив Код',
            'Картны №',
            'РД',
            'Овог',
            'Нэр',
            'Утас',
            'Зүүсэн өдөр',
            'Салгасан өдөр',
            'Тэмдэглэл',
        ];
    }

    public function map($record): array
    {
        return [
            $record->doctor?->name ?? '',
            $record->appliance_type === 'removable' ? 'Авагддаг' : 'Авагддаггүй',
            $record->archive_code ?? '',
            $record->card_number ?? '',
            $record->register_number ?? '',
            $record->last_name,
            $record->first_name,
            $record->phone ?? '',
            $record->attached_date?->format('Y-m-d') ?? '',
            $record->removed_date?->format('Y-m-d') ?? '',
            $record->notes ?? '',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFC0392B']],
                'alignment' => ['horizontal' => 'center'],
            ],
        ];
    }
}
