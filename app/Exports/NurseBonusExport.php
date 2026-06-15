<?php

namespace App\Exports;

use App\Models\HR\NurseBonusEntry;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class NurseBonusExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles, WithEvents
{
    /** @var string[] */
    private array $preKeys = NurseBonusEntry::PRE_KEYS;

    public function __construct(
        private Collection $entries,
        private $criteria,
        private $nurseBonusRun,
    ) {}

    public function collection(): Collection
    {
        return $this->entries;
    }

    public function headings(): array
    {
        $headings = ['Ажилтан', 'Албан тушаал'];

        foreach ($this->criteria as $key => $c) {
            $price = ($key === 'complaint' || $key === 'absent' ? '-' : '').number_format(abs($c['price']));
            $headings[] = $c['label'].' ('.$price.'₮/'.$c['unit'].')';

            if ($key === 'material_prep') {
                $headings[] = 'Нийт үзлэгийн тоо (удаа)';
                $headings[] = 'Нийлбэр оноо (= тоо × нийлбэр)';
            }
        }

        $headings[] = 'Нийт';

        return $headings;
    }

    public function map($entry): array
    {
        $row = [
            $entry['name'] ?? '',
            $entry['position'] ?? '',
        ];

        $sumPre = 0;
        foreach ($this->preKeys as $k) {
            $sumPre += $entry[$k] ?? 0;
        }
        $niilberOnoo = ($entry['visit_count'] ?? 0) * $sumPre;

        foreach ($this->criteria as $key => $c) {
            $val = $entry[$key] ?? 0;
            $row[] = $val ?: null;

            if ($key === 'material_prep') {
                $row[] = ($entry['visit_count'] ?? 0) ?: null;
                $row[] = $niilberOnoo ?: null;
            }
        }

        $row[] = ($entry['total_amount'] ?? 0) ?: null;

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

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Header мөр + өгөгдлийн мөрүүд + нэг нийт мөр
                $totalRow = $this->entries->count() + 2;

                // Нийт мөрийн утгуудыг бэлдэнэ (map()-тай ижил баганы дараалал)
                $rowValues = ['Нийт', ''];

                $totalVisit = $this->entries->sum('visit_count');
                $totalNiilber = $this->entries->sum(function ($e) {
                    $sumPre = 0;
                    foreach ($this->preKeys as $k) {
                        $sumPre += $e[$k] ?? 0;
                    }

                    return ($e['visit_count'] ?? 0) * $sumPre;
                });

                foreach ($this->criteria as $key => $c) {
                    $sum = $this->entries->sum($key);
                    $rowValues[] = $sum ?: null;

                    if ($key === 'material_prep') {
                        $rowValues[] = $totalVisit ?: null;
                        $rowValues[] = $totalNiilber ?: null;
                    }
                }

                $rowValues[] = $this->entries->sum('total_amount');

                $lastCol = Coordinate::stringFromColumnIndex(count($rowValues));

                $sheet->fromArray($rowValues, null, 'A'.$totalRow, true);

                $sheet->getStyle('A'.$totalRow.':'.$lastCol.$totalRow)->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFF1F5F9']],
                ]);
            },
        ];
    }
}
