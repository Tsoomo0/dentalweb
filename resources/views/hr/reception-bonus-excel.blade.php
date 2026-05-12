<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<table border="1" cellpadding="4" cellspacing="0" style="font-family:Arial;font-size:11px;border-collapse:collapse;">
    <tr>
        <td colspan="10" align="center" style="font-weight:bold;font-size:13px;padding:8px;">
            {{ $receptionBonusRun->title }}
        </td>
    </tr>
    <tr style="background:#7C3AED;color:#fff;font-weight:bold;text-align:center;">
        <td>№</td>
        <td>Ажилтан</td>
        <td>Албан тушаал</td>
        @foreach($criteria as $key => $c)
        <td>{{ $c['label'] }}<br/><span style="font-weight:normal;font-size:10px;">{{ number_format($c['price']) }}₮/{{ $c['unit'] }}</span></td>
        @endforeach
        <td style="background:#5B21B6;">Нийт ₮</td>
    </tr>
    @foreach($entries as $i => $e)
    <tr style="{{ $i % 2 === 1 ? 'background:#F5F3FF;' : '' }}">
        <td align="center">{{ $i + 1 }}</td>
        <td>{{ $e['name'] }}</td>
        <td>{{ $e['position'] ?? '' }}</td>
        @foreach($criteria as $key => $c)
        <td align="center">{{ $e[$key] ?: '' }}</td>
        @endforeach
        <td align="right" style="font-weight:bold;background:#EDE9FE;">{{ $e['total_amount'] ? number_format($e['total_amount']) : '' }}</td>
    </tr>
    @endforeach
    <tr style="font-weight:bold;background:#E5E7EB;">
        <td colspan="3" align="center">Нийт</td>
        @foreach($criteria as $key => $c)
        <td align="center">{{ $entries->sum($key) ?: '' }}</td>
        @endforeach
        <td align="right" style="background:#DDD6FE;">{{ number_format($entries->sum('total_amount')) }}</td>
    </tr>
</table>
</body>
</html>
