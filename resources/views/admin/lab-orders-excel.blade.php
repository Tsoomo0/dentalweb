<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<table border="1" cellpadding="4" cellspacing="0" style="font-family:Arial;font-size:11px;border-collapse:collapse;">
    <tr>
        <td colspan="20" align="center" style="font-weight:bold;font-size:13px;padding:8px;">
            Лаб бүртгэл — {{ now()->format('Y.m.d') }}
            @if($status !== 'all')
                ({{ $status === 'active' ? 'Идэвхтэй' : 'Дууссан' }})
            @endif
            @if($search)
                — Хайлт: {{ $search }}
            @endif
        </td>
    </tr>
    <tr style="background:#7C3AED;color:#fff;font-weight:bold;text-align:center;">
        <td>№</td>
        <td>Захиалсан огноо</td>
        <td>Салбар</td>
        <td>Өвчтөн</td>
        <td>Утас</td>
        <td>Эмч</td>
        <td>Лаб</td>
        <td>Хийгдсэн ажил</td>
        <td>Төлөх дүн</td>
        <td>Төлсөн дүн</td>
        <td>Дутуу</td>
        <td>Нугалсан</td>
        <td>Өнгөлсөн</td>
        <td>Лаб руу явсан</td>
        <td>Лабаас ирсэн</td>
        <td>Ресепшнд ирсэн</td>
        <td>Үйлчлүүлэгч авсан</td>
        <td>Баримт №</td>
        <td>Статус</td>
        <td>Тэмдэглэл</td>
    </tr>

    @foreach($orders as $i => $o)
    <tr style="{{ $i % 2 === 1 ? 'background:#F5F3FF;' : '' }}">
        <td align="center">{{ $i + 1 }}</td>
        <td align="center">{{ $o['order_date'] ?? '' }}</td>
        <td>{{ $o['branch_name'] ?? '' }}</td>
        <td>{{ $o['patient'] ?? '' }}</td>
        <td>{{ $o['patient_phone'] ?? '' }}</td>
        <td>{{ $o['doctor_name'] ?? '' }}</td>
        <td>{{ $o['lab_name'] ?? '' }}</td>
        <td>{{ $o['work_description'] ?? '' }}</td>
        <td align="right" style="font-weight:bold;">{{ $o['amount_due'] ? number_format($o['amount_due']) : '' }}</td>
        <td align="right" style="color:#065F46;font-weight:bold;">{{ $o['amount_paid'] ? number_format($o['amount_paid']) : '' }}</td>
        <td align="right" style="{{ $o['outstanding'] > 0 ? 'color:#DC2626;font-weight:bold;' : 'color:#065F46;' }}">
            {{ $o['outstanding'] > 0 ? number_format($o['outstanding']) : '✓' }}
        </td>
        <td>{{ $o['bender_name'] ?? '' }}</td>
        <td>{{ $o['polisher_name'] ?? '' }}</td>
        <td align="center">{{ $o['sent_to_lab_date'] ?? '' }}</td>
        <td align="center">{{ $o['lab_ready_date'] ?? '' }}</td>
        <td align="center">{{ $o['arrived_date'] ?? '' }}</td>
        <td align="center">{{ $o['pickup_date'] ?? '' }}</td>
        <td>{{ $o['final_payment_receipt'] ?? '' }}</td>
        <td align="center" style="{{ $o['is_completed'] === 'Дууссан' ? 'color:#065F46;font-weight:bold;' : 'color:#7C3AED;' }}">
            {{ $o['is_completed'] }}
        </td>
        <td>{{ $o['notes'] ?? '' }}</td>
    </tr>
    @endforeach

    <tr style="font-weight:bold;background:#E5E7EB;">
        <td colspan="8" align="center">Нийт {{ $orders->count() }} бүртгэл</td>
        <td align="right">{{ number_format($orders->sum('amount_due')) }}</td>
        <td align="right" style="color:#065F46;">{{ number_format($orders->sum('amount_paid')) }}</td>
        <td align="right" style="color:#DC2626;">{{ number_format($orders->sum('outstanding')) }}</td>
        <td colspan="9"></td>
    </tr>
</table>
</body>
</html>
