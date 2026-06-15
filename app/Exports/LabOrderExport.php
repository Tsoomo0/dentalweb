<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LabOrderExport implements FromCollection, ShouldAutoSize, WithEvents, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $orders) {}

    public function collection(): Collection
    {
        return $this->orders;
    }

    public function headings(): array
    {
        return [
            'Захиалсан огноо',
            'Салбар',
            'Өвчтөн',
            'Утас',
            'Эмч',
            'Лаб',
            'Хийгдсэн ажил',
            'Төлөх дүн',
            'Төлсөн дүн',
            'Дутуу',
            'Нугалсан',
            'Өнгөлсөн',
            'Лаб руу явсан',
            'Лабаас ирсэн',
            'Ресепшнд ирсэн',
            'Үйлчлүүлэгч авсан',
            'Баримт №',
            'Статус',
            'Тэмдэглэл',
        ];
    }

    public function map($order): array
    {
        return [
            $order['order_date'] ?? '—',
            $order['branch_name'] ?? '—',
            $order['patient'] ?? '—',
            $order['patient_phone'] ?? '—',
            $order['doctor_name'] ?? '—',
            $order['lab_name'] ?? '—',
            $order['work_description'] ?? '—',
            $order['amount_due'] ?? 0,
            $order['amount_paid'] ?? 0,
            $order['outstanding'] ?? 0,
            $order['bender_name'] ?? '—',
            $order['polisher_name'] ?? '—',
            $order['sent_to_lab_date'] ?? '—',
            $order['lab_ready_date'] ?? '—',
            $order['arrived_date'] ?? '—',
            $order['pickup_date'] ?? '—',
            $order['final_payment_receipt'] ?? '—',
            $order['is_completed'] ?? '—',
            $order['notes'] ?? '—',
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

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();
                $summaryRow = $lastRow + 1;

                $sheet->setCellValue('A'.$summaryRow, 'Нийт '.$this->orders->count().' бүртгэл');
                $sheet->setCellValue('H'.$summaryRow, $this->orders->sum('amount_due'));
                $sheet->setCellValue('I'.$summaryRow, $this->orders->sum('amount_paid'));
                $sheet->setCellValue('J'.$summaryRow, $this->orders->sum('outstanding'));

                $sheet->getStyle('A'.$summaryRow.':S'.$summaryRow)->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FFF1F5F9']],
                ]);
            },
        ];
    }
}
