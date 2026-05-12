<!DOCTYPE html>
<html lang="mn">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 10pt; color: #111; background: #fff; }
  .page { padding: 28px 36px; }

  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .header-table td { vertical-align: middle; padding: 0; }
  .logo-cell { width: 90px; }
  .logo-cell img { width: 80px; height: 80px; object-fit: contain; }
  .title-cell { text-align: center; }
  .title-cell h1 { font-size: 16pt; font-weight: bold; letter-spacing: 2px; color: #111; }
  .title-cell p { font-size: 9pt; color: #555; margin-top: 3px; }
  .title-spacer { width: 90px; }

  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .info-table td { padding: 3px 6px 3px 0; font-size: 9.5pt; vertical-align: bottom; }
  .info-label { color: #444; white-space: nowrap; width: 1%; }
  .info-value { border-bottom: 1px solid #aaa; min-width: 160px; padding-bottom: 1px; color: #111; }
  .info-gap { width: 24px; }

  .balance-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; background: #f9fafb; }
  .balance-table td { border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 9.5pt; text-align: center; }
  .balance-table th { border: 1px solid #e5e7eb; padding: 6px 12px; font-size: 8.5pt; background: #f3f4f6; font-weight: bold; }

  .main-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .main-table th, .main-table td { border: 1px solid #bbb; padding: 8px 10px; text-align: left; font-size: 9.5pt; vertical-align: top; }
  .main-table th { font-weight: bold; background: #f5f5f5; }

  .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .detail-table td { border: 1px solid #bbb; padding: 8px 10px; font-size: 9.5pt; vertical-align: top; }
  .detail-label { font-weight: bold; width: 40%; background: #f9fafb; }

  .approval-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .approval-table td { border: 1px solid #bbb; padding: 10px 12px; vertical-align: top; font-size: 9.5pt; }
  .approval-label { font-weight: bold; display: block; margin-bottom: 30px; }

  .note { font-size: 8.5pt; color: #444; margin-bottom: 18px; }
  .footer-table { width: 100%; border-collapse: collapse; }
  .footer-table td { border: 1px solid #bbb; padding: 6px 10px; font-size: 8pt; vertical-align: top; color: #555; }
</style>
</head>
<body>
<div class="page">

  {{-- ── HEADER ── --}}
  <table class="header-table">
    <tr>
      <td class="logo-cell">
        @if($logoPath)
          <img src="{{ $logoPath }}" alt="logo" />
        @else
          <div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:9pt;color:#aaa">LOGO</div>
        @endif
      </td>
      <td class="title-cell">
        <h1>ЭЭЛЖИЙН АМРАЛТЫН ХУУДАС</h1>
        <p>{{ $siteName }}</p>
      </td>
      <td class="title-spacer"></td>
    </tr>
  </table>

  {{-- ── EMPLOYEE INFO ── --}}
  <table class="info-table">
    <tr>
      <td class="info-label">Овог нэр:</td>
      <td class="info-value">{{ $r->employee->full_name }}</td>
      <td class="info-gap"></td>
      <td class="info-label">Албан тушаал:</td>
      <td class="info-value">{{ $r->employee->position?->name ?? '—' }}</td>
    </tr>
    <tr>
      <td class="info-label">Ажилтны дугаар:</td>
      <td class="info-value">{{ $r->employee->employee_number }}</td>
      <td class="info-gap"></td>
      <td class="info-label">Харьяалагдах салбар:</td>
      <td class="info-value">{{ $r->employee->branch?->name ?? '—' }}</td>
    </tr>
    <tr>
      <td class="info-label">Илгээсэн огноо:</td>
      <td class="info-value">{{ $r->created_at->format('Y-m-d') }}</td>
      <td class="info-gap"></td>
      <td class="info-label">Статус:</td>
      <td class="info-value">
        @if($r->isApproved()) Зөвшөөрсөн
        @elseif($r->isRejected()) Цуцалсан
        @else Хүлээгдэж байна @endif
      </td>
    </tr>
  </table>

  {{-- ── VACATION BALANCE ── --}}
  <table class="balance-table">
    <tr>
      <th>Зөвшөөрөгдсөн нийт хоног</th>
      <th>Ашигласан хоног ({{ now()->year }} он)</th>
      <th>Үлдсэн хоног</th>
    </tr>
    <tr>
      <td>{{ $allowed }} өдөр</td>
      <td>{{ $used }} өдөр</td>
      <td><strong>{{ $remaining }} өдөр</strong></td>
    </tr>
  </table>

  {{-- ── MAIN LEAVE DETAILS ── --}}
  <table class="main-table">
    <thead>
      <tr>
        <th>Эхлэх огноо</th>
        <th>Дуусах огноо</th>
        <th>Нийт хоног</th>
        <th>Энэ жил авсан эсэх</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{{ $r->start_date->format('Y-m-d') }}</td>
        <td>{{ $r->end_date->format('Y-m-d') }}</td>
        <td>{{ $r->days }} өдөр</td>
        <td>{{ $r->had_annual_leave_this_year ? 'Тийм' : 'Үгүй' }}</td>
      </tr>
    </tbody>
  </table>

  {{-- ── DETAIL INFO ── --}}
  <table class="detail-table">
    <tr>
      <td class="detail-label">Амралтын байршил:</td>
      <td>{{ $r->location_during_leave }}</td>
    </tr>
    <tr>
      <td class="detail-label">Яаралтай холбоо барих:</td>
      <td>{{ $r->emergency_phone }}</td>
    </tr>
    @if($r->replacement)
    <tr>
      <td class="detail-label">Орлох ажилтан:</td>
      <td>{{ $r->replacement->full_name }}</td>
    </tr>
    @endif
    <tr>
      <td class="detail-label">Шалтгаан:</td>
      <td>{{ $r->reason }}</td>
    </tr>
  </table>

  {{-- ── APPROVAL ── --}}
  <table class="approval-table">
    <tr>
      <td style="width:35%">
        <span class="approval-label">Зөвшөөрсөн:<br>Захирал</span>
        <span style="display:block;margin-top:8px">/ <span style="display:inline-block;width:120px"></span></span>
        <span style="display:block;margin-top:4px;border-top:1px solid #bbb;padding-top:2px">/</span>
      </td>
      <td style="width:40%">
        <span class="approval-label">Огноо:</span>
        <span style="display:block;border-bottom:1px solid #aaa;min-height:20px;padding-bottom:2px">
          {{ $r->reviewed_at?->format('Y-m-d') ?? $r->created_at->format('Y-m-d') }}
        </span>
      </td>
      <td style="width:25%">
        <span class="approval-label">Ажилтны гарын үсэг:</span>
        <span style="display:block;border-bottom:1px solid #aaa;min-height:20px"></span>
      </td>
    </tr>
  </table>

  <p class="note">*Энэхүү хуудсыг эмнэлгийн захиргаанд өгнө.</p>

  <table class="footer-table">
    <tr>
      <td style="width:33%">Боловсруулсан:<br><br>Эмнэлгийн захиргаа</td>
      <td style="width:33%">Хянасан:<br><br>Захирал</td>
      <td style="width:34%">
        Хэвлэлт №01, Нэмэлт, өөрчлөлт №00<br>
        Батлагдсан огноо: {{ now()->format('Y.m.d') }}
      </td>
    </tr>
  </table>

</div>
</body>
</html>
