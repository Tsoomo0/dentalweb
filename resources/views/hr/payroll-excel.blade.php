<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<table border="1" cellpadding="4" cellspacing="0" style="font-family:Arial;font-size:11px;border-collapse:collapse;">
    <tr>
        <td colspan="25" align="center" style="font-weight:bold;font-size:13px;padding:8px;">
            {{ $payrollRun->title }}
        </td>
    </tr>
    <tr style="background:#F9C74F;font-weight:bold;text-align:center;">
        <td>№</td>
        <td>Овог нэр</td>
        <td>Регистр</td>
        <td>Ажил</td>
        <td>Банкаар олгосон (урьд)</td>
        <td>Баярын урьдчилгаа</td>
        <td>Үндсэн цалин</td>
        <td>НД цалин</td>
        <td>А.Т.Х 40%</td>
        <td>Илүү цаг 10%</td>
        <td>Ээлж.амр+хувь</td>
        <td>Ажлын өдөр</td>
        <td>Ажилласан өдөр</td>
        <td>1 өдрийн цалин</td>
        <td>Хоол</td>
        <td>Унаа</td>
        <td>Сүү</td>
        <td>Нийт нэмэгдэл</td>
        <td>Хоцролт</td>
        <td>Хуруу</td>
        <td>Суутгал</td>
        <td>Тооцсон цалин</td>
        <td>НД цалин (нийт)</td>
        <td>НДШ 11.5%</td>
        <td>ХХОАТ</td>
        <td>НДШ+ХХОАТ</td>
        <td>Гарт олгох</td>
        <td>Банкаар олгох</td>
        <td>Данс</td>
    </tr>
    @foreach($entries as $i => $e)
    <tr style="{{ $loop->even ? 'background:#FFF9E6;' : '' }}">
        <td align="center">{{ $loop->iteration }}</td>
        <td>{{ $e['name'] }}</td>
        <td>{{ $e['register_number'] }}</td>
        <td>{{ $e['position'] }}</td>
        <td align="right">{{ number_format($e['prev_paid'], 2) }}</td>
        <td align="right">{{ number_format($e['holiday_advance'], 2) }}</td>
        <td align="right">{{ number_format($e['basic_salary'], 2) }}</td>
        <td align="right">{{ number_format($e['nd_salary'], 2) }}</td>
        <td align="right">{{ number_format($e['ath_bonus'], 2) }}</td>
        <td align="right">{{ number_format($e['overtime_bonus'], 2) }}</td>
        <td align="right">{{ number_format($e['vacation_pay'], 2) }}</td>
        <td align="center">{{ $e['working_days'] }}</td>
        <td align="center">{{ $e['worked_days'] }}</td>
        <td align="right">{{ number_format($e['daily_rate'], 2) }}</td>
        <td align="right">{{ number_format($e['food'], 2) }}</td>
        <td align="right">{{ number_format($e['transport'], 2) }}</td>
        <td align="right">{{ number_format($e['milk'], 2) }}</td>
        <td align="right">{{ number_format($e['total_bonus'], 2) }}</td>
        <td align="right">{{ number_format($e['tardiness'], 2) }}</td>
        <td align="right">{{ number_format($e['no_fingerprint'], 2) }}</td>
        <td align="right">{{ number_format($e['other_deduction'], 2) }}</td>
        <td align="right"><b>{{ number_format($e['calc_salary'], 2) }}</b></td>
        <td align="right">{{ number_format($e['nd_total'], 2) }}</td>
        <td align="right">{{ number_format($e['ndsh'], 2) }}</td>
        <td align="right">{{ number_format($e['income_tax'], 2) }}</td>
        <td align="right">{{ number_format($e['ndsh'] + $e['income_tax'], 2) }}</td>
        <td align="right"><b>{{ number_format($e['net_hand'], 2) }}</b></td>
        <td align="right" style="background:#E8F8F0;"><b>{{ number_format($e['bank_salary'], 2) }}</b></td>
        <td>{{ $e['bank_account'] }}</td>
    </tr>
    @endforeach
    <tr style="font-weight:bold;background:#E0E0E0;">
        <td colspan="4" align="center">Нийт</td>
        <td align="right">{{ number_format($entries->sum('prev_paid'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('holiday_advance'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('basic_salary'), 2) }}</td>
        <td></td>
        <td align="right">{{ number_format($entries->sum('ath_bonus'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('overtime_bonus'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('vacation_pay'), 2) }}</td>
        <td></td><td></td><td></td>
        <td align="right">{{ number_format($entries->sum('food'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('transport'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('milk'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('total_bonus'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('tardiness'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('no_fingerprint'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('other_deduction'), 2) }}</td>
        <td align="right"><b>{{ number_format($entries->sum('calc_salary'), 2) }}</b></td>
        <td align="right">{{ number_format($entries->sum('nd_total'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('ndsh'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum('income_tax'), 2) }}</td>
        <td align="right">{{ number_format($entries->sum(fn($e) => $e['ndsh'] + $e['income_tax']), 2) }}</td>
        <td align="right"><b>{{ number_format($entries->sum('net_hand'), 2) }}</b></td>
        <td align="right" style="background:#C8F0D8;"><b>{{ number_format($entries->sum('bank_salary'), 2) }}</b></td>
        <td></td>
    </tr>
</table>
</body>
</html>
