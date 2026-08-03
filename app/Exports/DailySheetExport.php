<?php

namespace App\Exports;

use App\Models\OverpaidUsage;
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
        $credits = $this->appliedCredits();

        foreach ($this->sheets as $sheet) {
            $entries = $sheet->entries;
            if ($this->doctorId) {
                $entries = $entries->filter(fn ($e) => $e->doctor_id == $this->doctorId);
            }

            foreach ($entries as $e) {
                $tech = $techNames[$e->technician_employee_id] ?? null;
                $creditKey = $sheet->branch_id.'|'.$sheet->date->format('Y-m-d').'|'.$e->appointment_number;
                $credit = $credits[$creditKey] ?? 0;

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
                    // Илүү багана: энэ мөрийн илүүдэл + өөр өдрөөс энд ашигласан дүн
                    (float) ((int) $e->overpaid_amount + $credit),
                    (float) $e->total_amount,
                    (float) $this->outstandingOf($e, $credit),
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

    /**
     * Салбар|огноо|баримт → тухайн мөрд орсон илүү тооцооны кредитийн нийлбэр.
     *
     * @return array<string, int>
     */
    private function appliedCredits(): array
    {
        $receipts = $this->sheets
            ->flatMap(fn ($sheet) => $sheet->entries->pluck('appointment_number'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($receipts)) {
            return [];
        }

        return OverpaidUsage::whereIn('target_receipt', $receipts)
            ->whereNotNull('target_date')
            ->with('sourceEntry.dailySheet')
            ->get()
            ->groupBy(fn ($u) => $u->sourceEntry?->dailySheet?->branch_id
                .'|'.$u->target_date->format('Y-m-d')
                .'|'.$u->target_receipt)
            ->map(fn ($group) => (int) $group->sum('amount'))
            ->all();
    }

    /**
     * Мөрийн бодит дутуу дүн — илүү тооцооны кредитийг төлбөрт тооцно.
     * Дэлгэц дээрх бодолттой ижил (DB-д хүрэхгүй).
     */
    private function outstandingOf($e, int $credit): int
    {
        if ((int) $e->gross_amount <= 0) {
            return (int) $e->outstanding_amount;
        }

        $paid = (int) $e->mobile_amount + (int) $e->card_amount
            + (int) $e->cash_amount + (int) $e->storepay_amount + $credit;

        return max(0, (int) $e->total_amount - $paid);
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
