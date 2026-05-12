<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
@verbatim
<!--[if gte mso 9]>
<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Ирцийн бүртгэл</x:Name>
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
    background-color: #fef2f2;
    padding: 10px 14px;
    border-bottom: 3px solid #dc2626;
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

  .num-col   { text-align: center; color: #6b7280; }
  .time-col  { text-align: center; white-space: nowrap; font-weight: bold; }
  .date-col  { text-align: center; white-space: nowrap; }
  .name-col  { font-weight: bold; color: #111827; }
  .hours-col { text-align: center; font-weight: bold; color: #059669; }
  .absent-col{ text-align: center; color: #9ca3af; }

  .status-working  { color: #d97706; font-weight: bold; }
  .status-done     { color: #16a34a; font-weight: bold; }
  .status-no-entry { color: #9ca3af; }

  .summary-row td {
    font-size: 9pt;
    font-weight: bold;
    background-color: #f1f5f9;
    padding: 8px 10px;
    border: 1px solid #e5e7eb;
    text-align: center;
  }
  .summary-label { text-align: left !important; color: #374151; }
</style>
</head>
<body>
<table>
  {{-- Title --}}
  <tr class="title-row">
    <td colspan="8">ИРЦИЙН БҮРТГЭЛ — {{ $monthLabel }} {{ $year }}</td>
  </tr>
  <tr class="meta-row">
    <td colspan="8">
      Хэвлэсэн огноо: {{ now()->format('Y-m-d H:i') }}
      &nbsp;·&nbsp; Нийт: {{ count($logs) }} бүртгэл
      @if($employeeName) &nbsp;·&nbsp; Ажилтан: {{ $employeeName }} @endif
    </td>
  </tr>
  <tr class="spacer"><td colspan="8"></td></tr>

  {{-- Header --}}
  <tr class="header-row">
    <th style="width:40px">№</th>
    <th style="width:90px">Огноо</th>
    <th style="width:140px">Ажилтан</th>
    <th style="width:130px">Албан тушаал</th>
    <th style="width:80px">Ирсэн цаг</th>
    <th style="width:80px">Тарсан цаг</th>
    <th style="width:100px">Ажилласан цаг</th>
    <th style="width:110px">Статус</th>
  </tr>

  {{-- Data rows --}}
  @php $totalMins = 0; @endphp
  @foreach($logs as $i => $log)
  @php
    $totalMins += $log->worked_minutes;
    if ($log->checked_in_at && $log->checked_out_at) {
        $status = 'done'; $statusLabel = 'Дууссан';
    } elseif ($log->checked_in_at) {
        $status = 'working'; $statusLabel = 'Ажиллаж байна';
    } else {
        $status = 'no-entry'; $statusLabel = '—';
    }
    $workedH = intdiv($log->worked_minutes, 60);
    $workedM = $log->worked_minutes % 60;
    $workedLabel = $log->worked_minutes > 0 ? "{$workedH}ц {$workedM}мин" : '—';
  @endphp
  <tr class="data-row">
    <td class="num-col">{{ $i + 1 }}</td>
    <td class="date-col">{{ $log->date->format('Y-m-d') }}</td>
    <td class="name-col">{{ $log->employee->full_name }}</td>
    <td>{{ $log->employee->position?->name ?? '—' }}</td>
    <td class="time-col" style="color:#16a34a">{{ $log->checked_in_at ? $log->checked_in_at->format('H:i') : '—' }}</td>
    <td class="time-col" style="color:#2563eb">{{ $log->checked_out_at ? $log->checked_out_at->format('H:i') : '—' }}</td>
    <td class="{{ $log->worked_minutes > 0 ? 'hours-col' : 'absent-col' }}">{{ $workedLabel }}</td>
    <td class="status-{{ $status }}">{{ $statusLabel }}</td>
  </tr>
  @endforeach

  {{-- Summary --}}
  <tr class="spacer"><td colspan="8"></td></tr>
  @php
    $totalH = intdiv($totalMins, 60);
    $totalM = $totalMins % 60;
    $doneCount    = collect($logs)->filter(fn($l) => $l->checked_in_at && $l->checked_out_at)->count();
    $workingCount = collect($logs)->filter(fn($l) => $l->checked_in_at && !$l->checked_out_at)->count();
  @endphp
  <tr class="summary-row">
    <td class="summary-label" colspan="6">Нийт ажилласан цаг</td>
    <td>{{ $totalH }}ц {{ $totalM }}мин</td>
    <td></td>
  </tr>
  <tr>
    <td colspan="8" style="font-size:8.5pt; color:#9ca3af; padding:6px 10px; border-top:2px solid #e5e7eb;">
      Нийт {{ count($logs) }} бүртгэл &nbsp;|&nbsp;
      Дууссан: {{ $doneCount }} &nbsp;|&nbsp;
      Ажиллаж байна: {{ $workingCount }}
    </td>
  </tr>
</table>
</body>
</html>
