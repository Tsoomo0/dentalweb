@extends('emails.layouts.base')

@section('title', 'Цаг захиалга баталгаажлаа')

@section('header')
<div class="header header-red">
    <div class="header-icon">
        @if($recipient === 'patient') ✅ @else 📅 @endif
    </div>
    @if($recipient === 'patient')
        <h1>Таны цаг баталгаажлаа!</h1>
        <p>Захиалгын дугаар: <strong>#{{ $appointment->appointment_number }}</strong></p>
    @else
        <h1>Шинэ захиалга баталгаажлаа</h1>
        <p>Дугаар: <strong>#{{ $appointment->appointment_number }}</strong></p>
    @endif
</div>
@endsection

@section('content')
    <div class="section-title">Захиалгын мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Үйлчлүүлэгч</div>
            <div class="ivalue">{{ $appointment->patient_name }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Утасны дугаар</div>
            <div class="ivalue">{{ $appointment->patient_phone }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Эмч</div>
            <div class="ivalue">{{ $appointment->doctor?->name ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Огноо</div>
            <div class="ivalue">{{ $appointment->appointment_date->format('Y.m.d') }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Эхлэх цаг</div>
            <div class="ivalue">{{ $appointment->appointment_time }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Дуусах цаг</div>
            <div class="ivalue">{{ $appointment->appointment_time_end ?? '—' }}</div>
        </div>
    </div>

    @if($appointment->meet_link)
        <div class="section-title">Онлайн уулзалт</div>
        <div class="meet-box">
            <div class="meet-label">🎥 Google Meet линк</div>
            <a href="{{ $appointment->meet_link }}" class="btn btn-blue">Meet орох</a>
            <div class="meet-url">{{ $appointment->meet_link }}</div>
        </div>
    @endif

    @if($recipient === 'patient')
        <div class="notice notice-yellow">
            ⚠️ <strong>Анхааруулга:</strong> Тогтоосон цагтаа ирэхгүй тохиолдолд манай эмнэлэгтэй урьдчилан холбоо барина уу. Захиалгын дугаараа хадгалаарай.
        </div>
    @else
        <div class="notice notice-blue">
            📌 <strong>Санамж:</strong> Үйлчлүүлэгч тогтоосон цагтаа Google Meet-ээр холбогдох болно. Линкийг хадгалаарай.
        </div>
    @endif
@endsection
