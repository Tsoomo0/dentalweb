@extends('emails.layouts.base')

@section('title', 'Шинэ хүсэлт ирлээ')

@section('header')
<div class="header header-amber">
    <div class="header-icon">📋</div>
    <h1>Шинэ хүсэлт ирлээ</h1>
    <p><strong>{{ $form->name }}</strong> форм бөглөгдлөө</p>
</div>
@endsection

@section('content')
    <div class="section-title">Бөглөсөн мэдээлэл</div>
    <div class="info-grid">
        @foreach ($rows as $row)
        <div class="info-item">
            <div class="ilabel">{{ $row['label'] }}</div>
            <div class="ivalue">{{ $row['value'] !== '' ? $row['value'] : '—' }}</div>
        </div>
        @endforeach
    </div>

    <div class="section-title">Хүсэлтийн мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Илгээсэн</div>
            <div class="ivalue">{{ $contactName ?? 'Зочин' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Огноо</div>
            <div class="ivalue">{{ optional($submission->submitted_at)->format('Y.m.d H:i') ?? '—' }}</div>
        </div>
    </div>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/admin/social/forms" class="btn btn-blue">Бүх хариултыг үзэх</a>
    </div>
@endsection
