<!DOCTYPE html>
<html lang="mn">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 10pt; color: #111; background: #fff; }

  /* ── Page wrapper ── */
  .page { padding: 28px 36px; }

  /* ── Top header ── */
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .header-table td { vertical-align: middle; padding: 0; }
  .logo-cell { width: 90px; }
  .logo-cell img { width: 80px; height: 80px; object-fit: contain; }
  .logo-cell-placeholder { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #aaa; }
  .title-cell { text-align: center; }
  .title-cell h1 { font-size: 17pt; font-weight: bold; letter-spacing: 2px; color: #111; }
  .title-spacer { width: 90px; } /* balance */

  /* ── Info row ── */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .info-table td { padding: 3px 6px 3px 0; font-size: 9.5pt; vertical-align: bottom; }
  .info-label { color: #444; white-space: nowrap; width: 1%; }
  .info-value { border-bottom: 1px solid #aaa; min-width: 160px; padding-bottom: 1px; color: #111; }
  .info-gap { width: 24px; }

  /* ── Main table ── */
  .main-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .main-table th, .main-table td {
    border: 1px solid #bbb;
    padding: 8px 10px;
    text-align: left;
    font-size: 9.5pt;
    vertical-align: top;
  }
  .main-table th { font-weight: bold; background: #f5f5f5; }
  .main-table .reason-col { min-width: 160px; }
  .date-cell { white-space: nowrap; }

  /* ── Approval row ── */
  .approval-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .approval-table td {
    border: 1px solid #bbb;
    padding: 10px 12px;
    vertical-align: top;
    font-size: 9.5pt;
  }
  .approval-label { font-weight: bold; display: block; margin-bottom: 30px; }
  .approval-line { border-bottom: 1px solid #aaa; display: block; margin-top: 4px; }
  .approval-sign-area { min-height: 36px; }

  /* ── Note ── */
  .note { font-size: 8.5pt; color: #444; margin-bottom: 18px; }

  /* ── Footer ── */
  .footer-table { width: 100%; border-collapse: collapse; }
  .footer-table td {
    border: 1px solid #bbb;
    padding: 6px 10px;
    font-size: 8pt;
    vertical-align: top;
    color: #555;
  }
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
          <div class="logo-cell-placeholder">LOGO</div>
        @endif
      </td>
      <td class="title-cell">
        <h1>ЧӨЛӨӨНИЙ ХУУДАС</h1>
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
      <td class="info-label">Огноо:</td>
      <td class="info-value">{{ $r->created_at->format('Y-m-d') }}</td>
      <td class="info-gap"></td>
      <td class="info-label">Харьяалагдах салбар:</td>
      <td class="info-value">{{ $r->employee->branch?->name ?? '—' }}</td>
    </tr>
  </table>

  {{-- ── MAIN TABLE ── --}}
  <table class="main-table">
    <thead>
      <tr>
        <th style="width:22%">Чөлөө хүссэн цаг</th>
        <th style="width:20%">Эхлэх хугацаа</th>
        <th style="width:20%">Дуусах хугацаа</th>
        <th class="reason-col">Чөлөө хүсэх шалтгаан:</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="date-cell">{{ $r->created_at->format('Y-m-d') }}</td>
        <td class="date-cell">{{ $r->start_date->format('Y-m-d') }}</td>
        <td class="date-cell">{{ $r->end_date->format('Y-m-d') }}</td>
        <td style="min-height:50px">{{ $r->reason }}</td>
      </tr>
      <tr>
        <td colspan="4" style="height:36px"></td>
      </tr>
    </tbody>
  </table>

  {{-- ── APPROVAL ── --}}
  <table class="approval-table">
    <tr>
      <td style="width:35%">
        <span class="approval-label">Зөвшөөрсөн:<br>Захирал</span>
        <span style="display:block; margin-top:8px">/ <span class="approval-sign-area"></span></span>
        <span style="display:block; margin-top:4px; border-top:1px solid #bbb; padding-top:2px">/</span>
      </td>
      <td style="width:40%">
        <span class="approval-label">Огноо:</span>
        <span class="approval-line">
          @if($r->reviewed_at)
            {{ $r->reviewed_at->format('Y-m-d') }}
          @else
            {{ $r->created_at->format('Y-m-d') }}
          @endif
        </span>
      </td>
      <td style="width:25%"></td>
    </tr>
  </table>

  {{-- ── NOTE ── --}}
  <p class="note">*Энэхүү хуудсыг эмнэлгийн захиргаанд өгнө.</p>

  {{-- ── FOOTER ── --}}
  <table class="footer-table">
    <tr>
      <td style="width:33%">Боловсруулсан:<br><br>Эмнэлгийн захиргаа</td>
      <td style="width:33%">Хянасан:<br><br>Захирал</td>
      <td style="width:34%">
        Хэвлэлт №01, Нэмэлт, өөрчлөлт №00<br>
        Батлагдсан огноо: 2021.03.05<br>
        Нэмэлт, өөрчлөлтийн огноо:
      </td>
    </tr>
  </table>

</div>
</body>
</html>
