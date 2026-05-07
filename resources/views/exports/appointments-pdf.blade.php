<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <title>Цаг захиалгын тайлан</title>
    <style>
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            tr { page-break-inside: avoid; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 24px; }

        .toolbar { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .toolbar select, .toolbar input { border: 1px solid #ced4da; border-radius: 6px; padding: 6px 10px; font-size: 13px; background: #fff; }
        .btn { display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 6px; padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-primary { background: #dc2626; color: #fff; }
        .btn-primary:hover { background: #b91c1c; }
        .btn-secondary { background: #e9ecef; color: #495057; }
        .btn-secondary:hover { background: #dee2e6; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 16px; }
        .header-title { font-size: 22px; font-weight: 800; color: #dc2626; }
        .header-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .header-meta { text-align: right; font-size: 12px; color: #6b7280; }

        .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
        .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
        .stat-card .val { font-size: 22px; font-weight: 800; color: #111827; }
        .stat-card .lbl { font-size: 11px; color: #9ca3af; margin-top: 2px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        thead tr { background: #dc2626; color: #fff; }
        thead th { padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        tbody tr:hover { background: #fef2f2; }
        tbody td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; vertical-align: middle; }

        .badge { display: inline-block; border-radius: 20px; padding: 2px 10px; font-size: 10px; font-weight: 700; border: 1px solid; }
        .badge-pending   { background: #fef9c3; color: #854d0e; border-color: #fde047; }
        .badge-confirmed { background: #dcfce7; color: #166534; border-color: #86efac; }
        .badge-cancelled { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
        .badge-completed { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
        .badge-online    { background: #ede9fe; color: #4c1d95; border-color: #a78bfa; }
        .badge-inperson  { background: #e0f2fe; color: #0c4a6e; border-color: #7dd3fc; }

        .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    </style>
</head>
<body>

{{-- Print toolbar (no-print) --}}
<div class="toolbar no-print">
    <form method="GET" action="{{ route('admin.appointments.export-pdf') }}" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <label style="font-size:12px;font-weight:600;color:#6b7280;">Статус:</label>
        <select name="status">
            <option value="">Бүгд</option>
            @foreach(['pending'=>'Хүлээгдэж','confirmed'=>'Баталгаажсан','completed'=>'Дууссан','cancelled'=>'Цуцлагдсан'] as $v=>$l)
                <option value="{{ $v }}" {{ request('status')===$v?'selected':'' }}>{{ $l }}</option>
            @endforeach
        </select>
        <label style="font-size:12px;font-weight:600;color:#6b7280;">Эхлэх огноо:</label>
        <input type="date" name="date_from" value="{{ request('date_from') }}">
        <label style="font-size:12px;font-weight:600;color:#6b7280;">Дуусах огноо:</label>
        <input type="date" name="date_to" value="{{ request('date_to') }}">
        <label style="font-size:12px;font-weight:600;color:#6b7280;">Төрөл:</label>
        <select name="type">
            <option value="">Бүгд</option>
            <option value="online" {{ request('type')==='online'?'selected':'' }}>Онлайн</option>
            <option value="in_person" {{ request('type')==='in_person'?'selected':'' }}>Биечлэн</option>
        </select>
        <button type="submit" class="btn btn-secondary">🔄 Шүүх</button>
    </form>
    <button onclick="window.print()" class="btn btn-primary">🖨️ Хэвлэх / PDF хадгалах</button>
    <a href="/admin/appointments" class="btn btn-secondary">← Буцах</a>
</div>

{{-- Header --}}
<div class="header">
    <div>
        <div class="header-title">Цаг захиалгын тайлан</div>
        <div class="header-sub">
            @if(request('date_from') || request('date_to'))
                {{ request('date_from','') }} — {{ request('date_to','') }}
            @else
                {{ now()->format('Y оны m сарын') }} тайлан
            @endif
            @if(request('status'))
                · Статус: {{ ['pending'=>'Хүлээгдэж','confirmed'=>'Баталгаажсан','completed'=>'Дууссан','cancelled'=>'Цуцлагдсан'][request('status')] ?? '' }}
            @endif
        </div>
    </div>
    <div class="header-meta">
        Гаргасан: {{ now()->format('Y.m.d H:i') }}<br>
        Нийт бичлэг: {{ $appointments->count() }}
    </div>
</div>

{{-- Stats --}}
@php
$statuses = $appointments->groupBy('status');
$total    = $appointments->count();
$online   = $appointments->where('type','online')->count();
$inperson = $appointments->where('type','in_person')->count();
@endphp
<div class="stats">
    <div class="stat-card">
        <div class="val">{{ $total }}</div>
        <div class="lbl">Нийт</div>
    </div>
    <div class="stat-card">
        <div class="val" style="color:#ca8a04;">{{ $statuses->get('pending',collect())->count() }}</div>
        <div class="lbl">Хүлээгдэж</div>
    </div>
    <div class="stat-card">
        <div class="val" style="color:#16a34a;">{{ $statuses->get('confirmed',collect())->count() }}</div>
        <div class="lbl">Баталгаажсан</div>
    </div>
    <div class="stat-card">
        <div class="val" style="color:#1d4ed8;">{{ $statuses->get('completed',collect())->count() }}</div>
        <div class="lbl">Дууссан</div>
    </div>
    <div class="stat-card">
        <div class="val" style="color:#dc2626;">{{ $statuses->get('cancelled',collect())->count() }}</div>
        <div class="lbl">Цуцлагдсан</div>
    </div>
</div>

{{-- Table --}}
<table>
    <thead>
        <tr>
            <th>#</th>
            <th>Дугаар</th>
            <th>Үйлчлүүлэгч</th>
            <th>Утас</th>
            <th>Эмч</th>
            <th>Огноо</th>
            <th>Цаг</th>
            <th>Үйлчилгээ</th>
            <th>Төрөл</th>
            <th>Статус</th>
        </tr>
    </thead>
    <tbody>
        @forelse($appointments as $i => $a)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td style="font-weight:700;font-family:monospace;">{{ $a->appointment_number }}</td>
            <td>{{ $a->patient_name }}</td>
            <td>{{ $a->patient_phone }}</td>
            <td>{{ $a->doctor?->name ?? '—' }}</td>
            <td>{{ $a->appointment_date?->format('Y.m.d') ?? '—' }}</td>
            <td>{{ $a->appointment_time ? substr($a->appointment_time,0,5) : '—' }}</td>
            <td>{{ $a->service ?? '—' }}</td>
            <td>
                <span class="badge {{ $a->type === 'online' ? 'badge-online' : 'badge-inperson' }}">
                    {{ $a->type === 'online' ? 'Онлайн' : 'Биечлэн' }}
                </span>
            </td>
            <td>
                <span class="badge badge-{{ $a->status }}">
                    {{ ['pending'=>'Хүлээгдэж','confirmed'=>'Баталгаажсан','cancelled'=>'Цуцлагдсан','completed'=>'Дууссан'][$a->status] ?? $a->status }}
                </span>
            </td>
        </tr>
        @empty
        <tr><td colspan="10" style="text-align:center;padding:24px;color:#9ca3af;">Өгөгдөл олдсонгүй</td></tr>
        @endforelse
    </tbody>
</table>

<div class="footer">
    Cuticul Dental — Систем автоматаар үүсгэсэн тайлан · {{ now()->format('Y.m.d H:i') }}
</div>

</body>
</html>
