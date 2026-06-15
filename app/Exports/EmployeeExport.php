<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EmployeeExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private Collection $employees) {}

    public function collection(): Collection
    {
        return $this->employees;
    }

    public function headings(): array
    {
        return [
            // Base
            'Дугаар',
            // Хувийн мэдээлэл
            'Овог',
            'Нэр',
            'Ургийн овог',
            'Регистр',
            'Төрсөн огноо',
            'Хүйс',
            'Цусны бүлэг',
            'Яс үндэс',
            'Төрсөн газар',
            'Жолоо',
            'Цэргийн алба',
            // Боловсрол
            'Зэрэг',
            'Сургууль',
            'Мэргэжил',
            // Холбоо барих
            'Утас',
            'Имэйл',
            'Хаяг',
            // Яаралтай
            'Яаралтай нэр',
            'Яаралтай утас',
            'Хэн болох',
            // Ажлын мэдээлэл
            'Тушаал',
            'Салбар',
            'Ажилд орсон',
            'Туршилт дуусах',
            'Цалин',
            'Статус',
            // Банк
            'Банк',
            'Дансны дугаар',
            'Дансны нэр',
            // Гэр бүл
            'Гэрлэсэн',
            'Хүүхэдтэй',
            'Хүүхэд',
            // Тэмдэглэл
            'Тэмдэглэл',
        ];
    }

    public function map($employee): array
    {
        $genderLabel = match ($employee->gender) {
            'male' => 'Эрэгтэй',
            'female' => 'Эмэгтэй',
            default => '—',
        };
        $statusLabel = $employee->status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй';
        $yesNo = fn ($v) => $v ? 'Тийм' : 'Үгүй';

        return [
            // Base
            $employee->employee_number ?? '—',
            // Хувийн мэдээлэл
            $employee->last_name,
            $employee->first_name,
            $employee->family_name ?? '—',
            $employee->register_number ?? '—',
            $employee->birth_date?->format('Y-m-d') ?? '—',
            $genderLabel,
            $employee->blood_type ?? '—',
            $employee->ethnicity ?? '—',
            $employee->birth_place ?? '—',
            $employee->driver_license ?? '—',
            $yesNo($employee->military_service),
            // Боловсрол
            $employee->education_degree ?? '—',
            $employee->education_school ?? '—',
            $employee->education_major ?? '—',
            // Холбоо барих
            $employee->phone ?? '—',
            $employee->email ?? '—',
            $employee->address ?? '—',
            // Яаралтай
            $employee->emergency_name ?? '—',
            $employee->emergency_phone ?? '—',
            $employee->emergency_relation ?? '—',
            // Ажлын мэдээлэл
            $employee->position?->name ?? '—',
            $employee->branch?->name ?? '—',
            $employee->hired_date?->format('Y-m-d') ?? '—',
            $employee->probation_end_date?->format('Y-m-d') ?? '—',
            $employee->salary ? (int) $employee->salary : '—',
            $statusLabel,
            // Банк
            $employee->bank_name ?? '—',
            $employee->bank_account ?? '—',
            $employee->bank_account_name ?? '—',
            // Гэр бүл
            $yesNo($employee->is_married),
            $yesNo($employee->has_children),
            $employee->children_count ?? 0,
            // Тэмдэглэл
            $employee->notes ?? '—',
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
