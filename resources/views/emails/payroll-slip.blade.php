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
        <div class="amount-card amount-card-green">
            <div class="amount-label">Гарт олгох</div>
            <div class="amount-value">{{ number_format($entry->net_hand, 0) }}₮</div>
        </div>
        <div class="amount-card amount-card-green2">
            <div class="amount-label">Банкаар олгох</div>
            <div class="amount-value">{{ number_format($entry->bank_salary, 0) }}₮</div>
        </div>
    </div>

    <div class="section-title">Дэлгэрэнгүй задаргаа</div>
    @php
        $rows = [
            ['Үндсэн цалин',  $entry->basic_salary,   false],
            ['НД цалин',      $entry->nd_salary,       false],
            ['Урьд олгосон',  $entry->prev_paid,       false],
            ['Нийт нэмэгдэл', $entry->total_bonus,     false],
            ['Тооцсон цалин', $entry->calc_salary,     false],
            ['НДШ 11.5%',     $entry->ndsh,            true],
            ['ХХОАТ',         $entry->income_tax ?? 0, true],
        ];
    @endphp
    <table class="data-table">
        <thead>
            <tr>
                <th>Төрөл</th>
                <th class="right">Дүн</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as [$label, $value, $isDeduction])
                @if($value)
                <tr>
                    <td>{{ $label }}</td>
                    <td class="{{ $isDeduction ? 'negative' : 'right' }}">{{ number_format($value, 0) }}₮</td>
                </tr>
                @endif
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
