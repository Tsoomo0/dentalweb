<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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
        $techNames = $this->technicianNames();

        foreach ($this->sheets as $sheet) {
            $entries = $sheet->entries;
            if ($this->doctorId) {
                $entries = $entries->filter(fn ($e) => $e->doctor_id == $this->doctorId);
            }

            foreach ($entries as $e) {
                $tech = $techNames[$e->technician_employee_id] ?? null;

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
                    (float) $e->overpaid_amount,
                    (float) $e->total_amount,
                    (float) $e->outstanding_amount,
                    // Эмч багана — эмч сонгоогүй, зөвхөн рентген техникч сонгосон
                    // мөрүүд хоосон гарахгүйн тулд техникчийн нэрийг нөхнө
                    $this->providerName($e->doctor?->name, $tech),
                    $e->user?->name ?? '',
                ]);
            }
        }

        return $rows;
    }

    public function headings(): array
    {
        return [
            'Огноо', 'Салбар', 'Үйлчлүүлэгч', 'Хүйс', 'Онош/Үйлчилгээ',
            'Захиалгын №', 'Хөнгөлөлт', 'Мобайл', 'Карт', 'Бэлэн',
            'Storepay', 'Илүү', 'Нийт дүн', 'Дутуу', 'Эмч', 'Ресепшн',
        ];
    }

    /** Эмч / рентген техникч — хоёулаа байвал зэрэг харуулна */
    private function providerName(?string $doctor, ?string $technician): string
    {
        return implode(' / ', array_filter([$doctor, $technician]));
    }

    /**
     * Бүх мөрийн рентген техникчийн нэрийг нэг query-ээр татна (N+1 болохгүй).
     *
     * @return array<int, string>
     */
    private function technicianNames(): array
    {
        $ids = $this->sheets
            ->flatMap(fn ($sheet) => $sheet->entries->pluck('technician_employee_id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($ids)) {
            return [];
        }

        return DB::table('employees')
            ->whereIn('id', $ids)
            ->get(['id', 'first_name', 'last_name'])
            ->mapWithKeys(function ($emp) {
                // Овог нь "—" зэрэг орлуулагч байвал алгасна
                $last = preg_match('/^[\-—\s]+$/', trim((string) $emp->last_name))
                    ? ''
                    : trim((string) $emp->last_name);

                return [$emp->id => trim($last.' '.$emp->first_name)];
            })
            ->filter()
            ->all();
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
