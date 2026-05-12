<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
@verbatim
<!--[if gte mso 9]>
<xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Ажилтнууд</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
<![endif]-->
@endverbatim
<style>
  body { font-family: Arial, sans-serif; font-size: 9pt; }

  .title-row td {
    font-size: 13pt; font-weight: bold;
    color: #1a1a2e; background-color: #f0f4ff;
    padding: 10px 14px; border-bottom: 3px solid #dc2626;
  }
  .meta-row td {
    font-size: 8.5pt; color: #6b7280;
    padding: 4px 14px; background-color: #f9fafb;
  }
  .spacer td { height: 8px; }

  .section-row th {
    background-color: #374151; color: #f9fafb;
    font-size: 8pt; font-weight: bold;
    padding: 5px 8px; text-align: center;
    border: 1px solid #4b5563;
  }
  .header-row th {
    background-color: #1e293b; color: #ffffff;
    font-size: 8pt; font-weight: bold;
    padding: 7px 8px; text-align: center;
    border: 1px solid #374151; white-space: nowrap;
  }

  .data-row td {
    font-size: 8.5pt; padding: 6px 8px;
    border: 1px solid #e5e7eb; vertical-align: middle;
  }
  .data-row:nth-child(even) td { background-color: #f8fafc; }
  .data-row:nth-child(odd)  td { background-color: #ffffff; }

  .num-col   { text-align: center; color: #6b7280; width: 35px; }
  .date-col  { text-align: center; white-space: nowrap; }
  .name-col  { font-weight: bold; color: #111827; }
  .center    { text-align: center; }
  .mono      { font-family: Courier New, monospace; font-size: 8pt; }

  .active    { color: #16a34a; font-weight: bold; }
  .inactive  { color: #9ca3af; font-weight: bold; }
  .male      { color: #2563eb; }
  .female    { color: #db2777; }
  .yes       { color: #16a34a; }
  .no        { color: #9ca3af; }

  .group-personal  td { border-left: 3px solid #6366f1; }
  .group-edu       td { border-left: 3px solid #0ea5e9; }
  .group-contact   td { border-left: 3px solid #22c55e; }
  .group-work      td { border-left: 3px solid #f59e0b; }
  .group-bank      td { border-left: 3px solid #8b5cf6; }
  .group-family    td { border-left: 3px solid #ec4899; }
</style>
</head>
<body>
<table>
  {{-- Title --}}
  <tr class="title-row">
    <td colspan="35">АЖИЛТНУУДЫН ДЭЛГЭРЭНГҮЙ ЖАГСААЛТ</td>
  </tr>
  <tr class="meta-row">
    <td colspan="35">
      Хэвлэсэн огноо: {{ now()->format('Y-m-d H:i') }}
      &nbsp;·&nbsp; Нийт: {{ count($employees) }} ажилтан
      &nbsp;·&nbsp; Идэвхтэй: {{ $employees->where('status','active')->count() }}
      &nbsp;·&nbsp; Эрэгтэй: {{ $employees->where('gender','male')->count() }}
      &nbsp;·&nbsp; Эмэгтэй: {{ $employees->where('gender','female')->count() }}
    </td>
  </tr>
  <tr class="spacer"><td colspan="35"></td></tr>

  {{-- Section labels --}}
  <tr class="section-row">
    <th colspan="2"></th>
    <th colspan="9" style="background-color:#4f46e5">ХУВИЙН МЭДЭЭЛЭЛ</th>
    <th colspan="3" style="background-color:#0284c7">БОЛОВСРОЛ</th>
    <th colspan="3" style="background-color:#16a34a">ХОЛБОО БАРИХ</th>
    <th colspan="3" style="background-color:#d97706">ЯАРАЛТАЙ</th>
    <th colspan="6" style="background-color:#b45309">АЖЛЫН МЭДЭЭЛЭЛ</th>
    <th colspan="3" style="background-color:#7c3aed">БАНК</th>
    <th colspan="4" style="background-color:#be185d">ГЭР БҮЛ</th>
    <th colspan="1" style="background-color:#374151">ТЭМДЭГЛЭЛ</th>
  </tr>

  {{-- Header --}}
  <tr class="header-row">
    {{-- Base --}}
    <th style="width:35px">№</th>
    <th style="width:75px">Дугаар</th>
    {{-- Хувийн --}}
    <th style="width:80px">Овог</th>
    <th style="width:80px">Нэр</th>
    <th style="width:90px">Ургийн овог</th>
    <th style="width:110px">Регистр</th>
    <th style="width:85px">Төрсөн огноо</th>
    <th style="width:70px">Хүйс</th>
    <th style="width:70px">Цусны бүлэг</th>
    <th style="width:80px">Яс үндэс</th>
    <th style="width:90px">Төрсөн газар</th>
    <th style="width:80px">Жолоо</th>
    <th style="width:70px">Цэргийн алба</th>
    {{-- Боловсрол --}}
    <th style="width:90px">Зэрэг</th>
    <th style="width:130px">Сургууль</th>
    <th style="width:110px">Мэргэжил</th>
    {{-- Холбоо --}}
    <th style="width:90px">Утас</th>
    <th style="width:130px">Имэйл</th>
    <th style="width:150px">Хаяг</th>
    {{-- Яаралтай --}}
    <th style="width:100px">Яаралтай нэр</th>
    <th style="width:90px">Яаралтай утас</th>
    <th style="width:80px">Хэн болох</th>
    {{-- Ажлын --}}
    <th style="width:110px">Тушаал</th>
    <th style="width:90px">Салбар</th>
    <th style="width:85px">Ажилд орсон</th>
    <th style="width:85px">Туршилт дуусах</th>
    <th style="width:90px">Цалин</th>
    <th style="width:75px">Статус</th>
    {{-- Банк --}}
    <th style="width:90px">Банк</th>
    <th style="width:110px">Дансны дугаар</th>
    <th style="width:110px">Дансны нэр</th>
    {{-- Гэр бүл --}}
    <th style="width:70px">Гэрлэсэн</th>
    <th style="width:70px">Хүүхэдтэй</th>
    <th style="width:60px">Хүүхэд</th>
    <th style="width:160px">Тэмдэглэл</th>
  </tr>

  {{-- Data --}}
  @foreach($employees as $i => $e)
  @php
    $genderLabel = match($e->gender) { 'male' => 'Эрэгтэй', 'female' => 'Эмэгтэй', default => '—' };
    $genderCls   = match($e->gender) { 'male' => 'male', 'female' => 'female', default => '' };
    $statusLabel = $e->status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй';
    $statusCls   = $e->status === 'active' ? 'active' : 'inactive';
    $yesNo       = fn($v) => $v ? 'Тийм' : 'Үгүй';
    $ynCls       = fn($v) => $v ? 'yes' : 'no';
  @endphp
  <tr class="data-row">
    <td class="num-col">{{ $i + 1 }}</td>
    <td class="center mono">{{ $e->employee_number }}</td>
    {{-- Хувийн --}}
    <td class="name-col">{{ $e->last_name }}</td>
    <td class="name-col">{{ $e->first_name }}</td>
    <td>{{ $e->family_name ?? '—' }}</td>
    <td class="mono center">{{ $e->register_number }}</td>
    <td class="date-col">{{ $e->birth_date?->format('Y-m-d') ?? '—' }}</td>
    <td class="center {{ $genderCls }}">{{ $genderLabel }}</td>
    <td class="center">{{ $e->blood_type ?? '—' }}</td>
    <td>{{ $e->ethnicity ?? '—' }}</td>
    <td>{{ $e->birth_place ?? '—' }}</td>
    <td class="center">{{ $e->driver_license ?? '—' }}</td>
    <td class="center {{ $ynCls($e->military_service) }}">{{ $yesNo($e->military_service) }}</td>
    {{-- Боловсрол --}}
    <td>{{ $e->education_degree ?? '—' }}</td>
    <td>{{ $e->education_school ?? '—' }}</td>
    <td>{{ $e->education_major ?? '—' }}</td>
    {{-- Холбоо --}}
    <td class="center">{{ $e->phone ?? '—' }}</td>
    <td>{{ $e->email ?? '—' }}</td>
    <td>{{ $e->address ?? '—' }}</td>
    {{-- Яаралтай --}}
    <td>{{ $e->emergency_name ?? '—' }}</td>
    <td class="center">{{ $e->emergency_phone ?? '—' }}</td>
    <td>{{ $e->emergency_relation ?? '—' }}</td>
    {{-- Ажлын --}}
    <td>{{ $e->position?->name ?? '—' }}</td>
    <td>{{ $e->branch?->name ?? '—' }}</td>
    <td class="date-col">{{ $e->hired_date?->format('Y-m-d') ?? '—' }}</td>
    <td class="date-col">{{ $e->probation_end_date?->format('Y-m-d') ?? '—' }}</td>
    <td class="center">{{ $e->salary ? number_format($e->salary) : '—' }}</td>
    <td class="center {{ $statusCls }}">{{ $statusLabel }}</td>
    {{-- Банк --}}
    <td>{{ $e->bank_name ?? '—' }}</td>
    <td class="mono center">{{ $e->bank_account ?? '—' }}</td>
    <td>{{ $e->bank_account_name ?? '—' }}</td>
    {{-- Гэр бүл --}}
    <td class="center {{ $ynCls($e->is_married) }}">{{ $yesNo($e->is_married) }}</td>
    <td class="center {{ $ynCls($e->has_children) }}">{{ $yesNo($e->has_children) }}</td>
    <td class="center">{{ $e->children_count ?? 0 }}</td>
    <td>{{ $e->notes ?? '—' }}</td>
  </tr>
  @endforeach

  {{-- Summary --}}
  <tr class="spacer"><td colspan="35"></td></tr>
  <tr>
    <td colspan="35" style="font-size:8pt; color:#9ca3af; padding:6px 10px; border-top:2px solid #e5e7eb;">
      Нийт {{ count($employees) }} ажилтан
      &nbsp;|&nbsp; Идэвхтэй: {{ $employees->where('status','active')->count() }}
      &nbsp;|&nbsp; Идэвхгүй: {{ $employees->where('status','inactive')->count() }}
      &nbsp;|&nbsp; Эрэгтэй: {{ $employees->where('gender','male')->count() }}
      &nbsp;|&nbsp; Эмэгтэй: {{ $employees->where('gender','female')->count() }}
      &nbsp;|&nbsp; Нийт хүүхэд: {{ $employees->sum('children_count') }}
    </td>
  </tr>
</table>
</body>
</html>
