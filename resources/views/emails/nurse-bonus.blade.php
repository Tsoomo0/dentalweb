@extends('emails.layouts.base')

@section('title', 'Сувилагчийн урамшуулал')

@section('header')
<div class="header header-cyan">
    <div class="header-icon">🏅</div>
    <h1>Сувилагчийн урамшуулал</h1>
    <p><strong>{{ $entry->run?->title }}</strong></p>
</div>
@endsection

@section('content')
    <div class="notice notice-gray">
        Сайн байна уу, <strong>{{ $entry->employee->full_name }}</strong>!
        Таны {{ $entry->run?->year }} оны {{ $entry->run?->month }}-р сар
        {{ $entry->run?->half === 'first' ? 'эхний хагас' : 'сүүл хагас' }} урамшуулал тооцоологдлоо.
    </div>

    <div class="section-title">Нийт урамшуулал</div>
    <div class="amount-card amount-card-cyan" style="margin-bottom:26px;">
        <div class="amount-label">Нийт дүн</div>
        <div class="amount-value">{{ number_format($entry->total_amount, 0) }}₮</div>
    </div>

    <div class="section-title">Урамшууллын задаргаа</div>
    @php
        $criteria = \App\Models\HR\NurseBonusEntry::CRITERIA;
    @endphp
    <table class="data-table">
        <thead>
            <tr>
                <th>Шалгуур</th>
                <th class="right">Тоо</th>
                <th class="right">Дүн</th>
            </tr>
        </thead>
        <tbody>
            @foreach($criteria as $key => $c)
                @php $count = $entry->{$key} ?? 0; $amount = $count * $c['price']; @endphp
                @if($count > 0)
                <tr>
                    <td>{{ $c['label'] }}</td>
                    <td class="muted">{{ $count }} {{ $c['unit'] }}</td>
                    <td class="{{ $amount < 0 ? 'negative' : 'right' }}">{{ number_format($amount, 0) }}₮</td>
                </tr>
                @endif
            @endforeach
        </tbody>
    </table>

    <div class="btn-block">
        <a href="{{ url('/my/nurse-bonus') }}" class="btn btn-cyan">
            Дэлгэрэнгүй харах →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
