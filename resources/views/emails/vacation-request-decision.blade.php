@extends('emails.layouts.base')

@section('title', 'Ээлжийн амралтын шийдвэр')

@section('header')
@if($vacationRequest->isApproved())
<div class="header header-green">
    <div class="header-icon">✅</div>
    <h1>Ээлжийн амралт зөвшөөрөгдлөө!</h1>
    <p>Таны хүсэлт хянагдаж баталгаажлаа</p>
</div>
@else
<div class="header header-danger">
    <div class="header-icon">❌</div>
    <h1>Ээлжийн амралт цуцлагдлаа</h1>
    <p>Таны хүсэлтийг хүлээж авах боломжгүй боллоо</p>
</div>
@endif
@endsection

@section('content')
    <div class="section-title">Амралтын мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Эхлэх огноо</div>
            <div class="ivalue">{{ $vacationRequest->start_date->format('Y.m.d') }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Дуусах огноо</div>
            <div class="ivalue">{{ $vacationRequest->end_date->format('Y.m.d') }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Нийт хоног</div>
            <div class="ivalue">{{ $vacationRequest->days }} өдөр</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Шийдвэрлэсэн огноо</div>
            <div class="ivalue">{{ $vacationRequest->reviewed_at?->format('Y.m.d') ?? '—' }}</div>
        </div>
    </div>

    @if($vacationRequest->isApproved())
        <div class="notice notice-green">
            ✅ <strong>Баяр хүргэе!</strong> Таны ээлжийн амралтын хүсэлт зөвшөөрөгдлөө.
            {{ $vacationRequest->start_date->format('Y.m.d') }} — {{ $vacationRequest->end_date->format('Y.m.d') }}
            хоорондох <strong>{{ $vacationRequest->days }} өдөр</strong> баталгаажлаа.
        </div>
    @else
        <div class="notice notice-red">
            <strong>Цуцлах шалтгаан:</strong><br>
            {{ $vacationRequest->rejection_reason ?? 'Шалтгаан заагаагүй байна.' }}
        </div>
    @endif
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
