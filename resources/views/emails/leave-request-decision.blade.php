@extends('emails.layouts.base')

@section('title', 'Чөлөөний хүсэлтийн шийдвэр')

@section('header')
@if($leaveRequest->isApproved())
<div class="header header-green">
    <div class="header-icon">✅</div>
    <h1>Чөлөөний хүсэлт зөвшөөрөгдлөө!</h1>
    <p>Таны хүсэлт баталгаажлаа</p>
</div>
@else
<div class="header header-danger">
    <div class="header-icon">❌</div>
    <h1>Чөлөөний хүсэлт цуцлагдлаа</h1>
    <p>Таны хүсэлтийг хүлээж авах боломжгүй боллоо</p>
</div>
@endif
@endsection

@section('content')
    <div class="section-title">Чөлөөний мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Эхлэх огноо</div>
            <div class="ivalue">{{ $leaveRequest->start_date->format('Y.m.d') }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Дуусах огноо</div>
            <div class="ivalue">{{ $leaveRequest->end_date->format('Y.m.d') }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Нийт өдөр</div>
            <div class="ivalue">{{ $leaveRequest->days }} өдөр</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Шийдвэрлэсэн огноо</div>
            <div class="ivalue">{{ $leaveRequest->reviewed_at?->format('Y.m.d') ?? '—' }}</div>
        </div>
    </div>

    @if($leaveRequest->isApproved())
        <div class="notice notice-green">
            ✅ <strong>Баяр хүргэе!</strong> Таны чөлөөний хүсэлт зөвшөөрөгдлөө.
            {{ $leaveRequest->start_date->format('Y.m.d') }} — {{ $leaveRequest->end_date->format('Y.m.d') }} хоорондох
            <strong>{{ $leaveRequest->days }} өдөр</strong> баталгаажлаа.
        </div>
    @else
        <div class="notice notice-red">
            <strong>Цуцлах шалтгаан:</strong><br>
            {{ $leaveRequest->rejection_reason ?? 'Шалтгаан заагаагүй байна.' }}
        </div>
    @endif
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
