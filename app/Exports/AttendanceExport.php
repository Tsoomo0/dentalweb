<?php

namespace App\Exports;

use App\Exports\Attendance\AttendanceDailySheet;
use App\Exports\Attendance\AttendanceSummarySheet;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * Ирцийн сарын тайлан: 1) ажилтан бүрийн нэгтгэл (цалин бодоход), 2) өдөр бүрийн мөр.
 * Хоёулаа нийтлэгдсэн хуваарьтай харьцуулсан хоцролт, эрт явсан, илүү цагтай.
 */
class AttendanceExport implements WithMultipleSheets
{
    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<array<string, mixed>>  $summary
     */
    public function __construct(private array $rows, private array $summary) {}

    public function sheets(): array
    {
        return [
            new AttendanceSummarySheet($this->summary),
            new AttendanceDailySheet($this->rows),
        ];
    }
}
