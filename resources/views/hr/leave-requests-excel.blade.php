<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
@verbatim
<!--[if gte mso 9]>
<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Чөлөөний хүсэлт</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
<![endif]-->
@endverbatim
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; }

  .title-row td {
    font-size: 14pt;
    font-weight: bold;
    color: #1a1a2e;
    background-color: #f0f4ff;
    padding: 10px 14px;
    border-bottom: 3px solid #4f46e5;
  }
  .meta-row td {
    font-size: 9pt;
    color: #6b7280;
    padding: 4px 14px;
    background-color: #f9fafb;
  }
  .spacer td { height: 10px; }

  .header-row th {
    background-color: #1e293b;
    color: #ffffff;
    font-size: 9pt;
    font-weight: bold;
    padding: 8px 10px;
    text-align: center;
    border: 1px solid #374151;
    white-space: nowrap;
  }

  .data-row td {
    font-size: 9pt;
    padding: 7px 10px;
    border: 1px solid #e5e7eb;
    vertical-align: middle;
  }
  .data-row:nth-child(even) td { background-color: #f8fafc; }
  .data-row:nth-child(odd)  td { background-color: #ffffff; }

  .status-pending  { color: #d97706; font-weight: bold; }
  .status-approved { color: #16a34a; font-weight: bold; }
  .status-rejected { color: #dc2626; font-weight: bold; }

  .type-sick     { color: #e11d48; font-weight: bold; }
  .type-personal { color: #0284c7; font-weight: bold; }

  .num-col { text-align: center; color: #6b7280; }
  .days-col { text-align: center; font-weight: bold; }
  .date-col { text-align: center; white-space: nowrap; }
  .name-col { font-weight: bold; color: #111827; }
</style>
</head>
<body>
<table>
  {{-- Title --}}
  <tr class="title-row">
    <td colspan="13">ЧӨЛӨӨНИЙ ХҮСЭЛТИЙН ЖАГСААЛТ</td>
  </tr>
  <tr class="meta-row">
    <td colspan="13">Хэвлэсэн огноо: {{ now()->format('Y-m-d H:i') }} &nbsp;·&nbsp; Нийт: {{ count($requests) }} хүсэлт</td>
  </tr>
  <tr class="spacer"><td colspan="13"></td></tr>

  {{-- Header --}}
  <tr class="header-row">
    <th style="width:40px">№</th>
    <th style="width:80px">Дугаар</th>
    <th style="width:140px">Ажилтан</th>
    <th style="width:120px">Тушаал</th>
    <th style="width:100px">Салбар</th>
    <th style="width:90px">Эхлэх</th>
    <th style="width:90px">Дуусах</th>
    <th style="width:50px">Өдөр</th>
    <th style="width:80px">Төрөл</th>
    <th style="width:200px">Шалтгаан</th>
    <th style="width:120px">Орлох</th>
    <th style="width:100px">Статус</th>
    <th style="width:120px">Шийдвэрлэсэн</th>
  </tr>

  {{-- Data rows --}}
  @foreach($requests as $i => $r)
  @php
    $leaveTypes = ['sick' => 'Өвчтэй', 'personal' => 'Хувийн'];
    $statusMap  = ['pending' => 'Хүлээгдэж байна', 'approved' => 'Зөвшөөрсөн', 'rejected' => 'Цуцалсан'];
    $statusCls  = ['pending' => 'status-pending', 'approved' => 'status-approved', 'rejected' => 'status-rejected'];
    $typeCls    = $r->leave_type === 'sick' ? 'type-sick' : 'type-personal';
  @endphp
  <tr class="data-row">
    <td class="num-col">{{ $i + 1 }}</td>
    <td class="date-col">{{ $r->employee->employee_number }}</td>
    <td class="name-col">{{ $r->employee->full_name }}</td>
    <td>{{ $r->employee->position?->name ?? '—' }}</td>
    <td>{{ $r->employee->branch?->name ?? '—' }}</td>
    <td class="date-col">{{ $r->start_date->format('Y-m-d') }}</td>
    <td class="date-col">{{ $r->end_date->format('Y-m-d') }}</td>
    <td class="days-col">{{ $r->days }}</td>
    <td class="{{ $typeCls }}">{{ $leaveTypes[$r->leave_type] ?? $r->leave_type }}</td>
    <td>{{ $r->reason }}</td>
    <td>{{ $r->replacement?->full_name ?? '—' }}</td>
    <td class="{{ $statusCls[$r->status] ?? '' }}">{{ $statusMap[$r->status] ?? $r->status }}</td>
    <td class="date-col">{{ $r->reviewer?->name ?? '—' }}{{ $r->reviewed_at ? ' · ' . $r->reviewed_at->format('Y-m-d') : '' }}</td>
  </tr>
  @endforeach

  {{-- Summary row --}}
  <tr class="spacer"><td colspan="13"></td></tr>
  <tr>
    <td colspan="13" style="font-size:8.5pt; color:#9ca3af; padding:6px 10px; border-top:2px solid #e5e7eb;">
      Нийт {{ count($requests) }} хүсэлт &nbsp;|&nbsp;
      Хүлээгдэж буй: {{ $requests->where('status','pending')->count() }} &nbsp;|&nbsp;
      Зөвшөөрсөн: {{ $requests->where('status','approved')->count() }} &nbsp;|&nbsp;
      Цуцалсан: {{ $requests->where('status','rejected')->count() }}
    </td>
  </tr>
</table>
</body>
</html>
