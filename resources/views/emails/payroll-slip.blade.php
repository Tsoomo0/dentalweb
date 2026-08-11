@extends('emails.layouts.base')

@section('title', 'Цалингийн задаргаа')

@section('header')
<div class="header header-red">
    <div class="header-icon">💰</div>
    <h1>Цалингийн задаргаа</h1>
    <p><strong>{{ $entry->run->title }}</strong></p>
</div>
@endsection

@section('content')
    <div class="notice notice-gray">
        Сайн байна уу, <strong>{{ $entry->employee->full_name }}</strong>!
        Таны {{ $entry->run->year }} оны {{ $entry->run->month }}-р сар
        {{ $entry->run->half === 'first' ? 'эхний хагас' : 'сүүл хагас' }} цалингийн задаргаа бэлэн боллоо.
    </div>

    <div class="section-title">Нийт дүн</div>
    <div class="amount-row">
        @php
            // Гарт олгох, банкаар олгох хоёр бутархайтай бол 2 орноор харуулна
            $money = fn ($v) => number_format($v, fmod((float) $v, 1) == 0.0 ? 0 : 2);
        @endphp
        <div class="amount-card amount-card-green">
            <div class="amount-label">Гарт олгох</div>
            <div class="amount-value">{{ $money($entry->net_hand) }}₮</div>
        </div>
        <div class="amount-card amount-card-green2">
            <div class="amount-label">Банкаар олгох</div>
            <div class="amount-value">{{ $money($entry->bank_salary) }}₮</div>
        </div>
    </div>

    <div class="section-title">Дэлгэрэнгүй задаргаа</div>
    @php
        // Задаргааг тухайн тооцооны хагасын схемээр угсарна —
        // эхэн болон сүүл цалин өөр өөр баганатай
        // Нягтлангийн гараар зассан дүнг хүндэтгэнэ — бодитоор олгосон дүн харагдана
        $columns = \App\Support\Payroll\PayrollSchema::columns($entry->run->half);
        $values = \App\Support\Payroll\PayrollSchema::compute(
            $entry->toArray(),
            $entry->run->half,
            is_array($entry->overrides) ? $entry->overrides : []
        );

        $rows = [];
        foreach ($columns as $column) {
            if (in_array($column['role'], ['rate', 'day', 'payout', 'reference'], true)) {
                continue;
            }
            if (empty($values[$column['key']])) {
                continue;
            }

            // Хоцролт/хуруу зэрэг дүнгийн хажууд тоо ширхэгийг нь харуулна
            $label = $column['label'];
            if ($column['counter'] && ! empty($values[$column['counter']['key']])) {
                $label .= ' ('.(0 + $values[$column['counter']['key']]).' '.$column['counter']['unit'].')';
            }

            $rows[] = [
                $label,
                $column['decimal'] ? $money($values[$column['key']]) : number_format($values[$column['key']]),
                $column['role'] === 'deduction',
            ];
        }
    @endphp
    <table class="data-table">
        <thead>
            <tr>
                <th>Төрөл</th>
                <th class="right">Дүн</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as [$label, $amount, $isDeduction])
                <tr>
                    <td>{{ $label }}</td>
                    <td class="{{ $isDeduction ? 'negative' : 'right' }}">{{ $amount }}₮</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="btn-block">
        <a href="{{ url('/my/payroll') }}" class="btn btn-red">
            Дэлгэрэнгүй харах →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
