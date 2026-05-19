<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
@php
    $preKeys   = ['clothing', 'hand_hygiene', 'chair_sterilization', 'equipment_prep', 'material_prep'];
    $deductKeys = ['complaint', 'absent'];
    // colspan: № + Ажилтан + Тушаал + criteria cols + visit_count + Нийлбэр оноо + Нийт = 3 + criteria + 3
    $totalCols = 3 + count($criteria) + 3;
@endphp
<table border="1" cellpadding="4" cellspacing="0" style="font-family:Arial;font-size:11px;border-collapse:collapse;">
    <tr>
        <td colspan="{{ $totalCols }}" align="center" style="font-weight:bold;font-size:13px;padding:8px;">
            {{ $nurseBonusRun->title }}
        </td>
    </tr>
    <tr style="background:#7C3AED;color:#fff;font-weight:bold;text-align:center;">
        <td>№</td>
        <td>Ажилтан</td>
        <td>Албан тушаал</td>
        @foreach($criteria as $key => $c)
            <td>{{ $c['label'] }}<br/><span style="font-weight:normal;font-size:10px;">{{ $key === 'complaint' || $key === 'absent' ? '-' : '' }}{{ number_format(abs($c['price'])) }}₮/{{ $c['unit'] }}</span></td>
            @if($key === 'material_prep')
                <td style="background:#1D4ED8;">Нийт үзлэгийн тоо<br/><span style="font-weight:normal;font-size:10px;">удаа</span></td>
                <td style="background:#065F46;">Нийлбэр оноо<br/><span style="font-weight:normal;font-size:10px;">= тоо × нийлбэр</span></td>
            @endif
        @endforeach
        <td style="background:#5B21B6;">Нийт</td>
    </tr>

    @foreach($entries as $i => $e)
    @php
        $sumPre      = collect($preKeys)->sum(fn($k) => $e[$k] ?? 0);
        $niilberOnoo = ($e['visit_count'] ?? 0) * $sumPre;
    @endphp
    <tr style="{{ $i % 2 === 1 ? 'background:#F5F3FF;' : '' }}">
        <td align="center">{{ $i + 1 }}</td>
        <td>{{ $e['name'] }}</td>
        <td>{{ $e['position'] ?? '' }}</td>
        @foreach($criteria as $key => $c)
            @if(in_array($key, $deductKeys))
                <td align="center" style="color:#DC2626;">{{ $e[$key] ?: '' }}</td>
            @else
                <td align="center">{{ $e[$key] ?: '' }}</td>
            @endif
            @if($key === 'material_prep')
                <td align="center" style="background:#EFF6FF;font-weight:bold;color:#1D4ED8;">{{ $e['visit_count'] ?: '' }}</td>
                <td align="right" style="background:#ECFDF5;font-weight:bold;color:#065F46;">{{ $niilberOnoo ? number_format($niilberOnoo) : '' }}</td>
            @endif
        @endforeach
        <td align="right" style="font-weight:bold;background:#EDE9FE;">{{ $e['total_amount'] ? number_format($e['total_amount']) : '' }}</td>
    </tr>
    @endforeach

    @php
        $totalVisit   = $entries->sum('visit_count');
        $totalNiilber = $entries->sum(function ($e) use ($preKeys) {
            $sumPre = collect($preKeys)->sum(fn($k) => $e[$k] ?? 0);
            return ($e['visit_count'] ?? 0) * $sumPre;
        });
    @endphp
    <tr style="font-weight:bold;background:#E5E7EB;">
        <td colspan="3" align="center">Нийт</td>
        @foreach($criteria as $key => $c)
            <td align="center">{{ $entries->sum($key) ?: '' }}</td>
            @if($key === 'material_prep')
                <td align="center" style="background:#DBEAFE;color:#1D4ED8;">{{ $totalVisit ?: '' }}</td>
                <td align="right" style="background:#D1FAE5;color:#065F46;">{{ $totalNiilber ? number_format($totalNiilber) : '' }}</td>
            @endif
        @endforeach
        <td align="right" style="background:#DDD6FE;">{{ number_format($entries->sum('total_amount')) }}</td>
    </tr>
</table>
</body>
</html>
