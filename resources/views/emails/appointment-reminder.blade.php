@extends('emails.layouts.base')

@section('title', 'Цагийн сануулга')

@section('header')
@if($appointment->type === 'in_person')
<div class="header header-amber">
    <div class="header-icon">🦷</div>
    @if($type === '24h')
        <h1>Таны үзүүлэх цаг маргааш болно</h1>
        <p>Захиалгын дугаар: <strong>#{{ $appointment->appointment_number }}</strong></p>
    @else
        <h1>Таны үзүүлэх цаг удахгүй болно!</h1>
        <p>Захиалгын дугаар: <strong>#{{ $appointment->appointment_number }}</strong></p>
    @endif
</div>
@else
<div class="header header-amber">
    <div class="header-icon">⏰</div>
    <h1>Онлайн зөвлөгөөний сануулга</h1>
    <p>
        <span style="display:inline-block;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.35);border-radius:99px;padding:3px 14px;font-size:12.5px;font-weight:700;color:#fff;margin-bottom:6px;">
            {{ $type === '24h' ? '24 цагийн' : '2 цагийн' }} дараа
        </span><br>
        Захиалгын дугаар: <strong>#{{ $appointment->appointment_number }}</strong>
    </p>
</div>
@endif
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
        @if($appointment->type === 'in_person' && $appointment->branch?->name)
        <div class="info-item full">
            <div class="ilabel">Эмнэлгийн байршил</div>
            <div class="ivalue">{{ $appointment->branch->name }}</div>
        </div>
        @endif
    </div>

    @if($appointment->type === 'in_person')
        {{-- Биечлэн ирэх сануулга --}}
        @if($type === '24h')
            <div class="notice notice-yellow">
                📅 <strong>Сануулга:</strong> Таны үзүүлэх цаг <strong>маргааш</strong>
                {{ $appointment->appointment_date->format('Y.m.d') }} өдрийн
                <strong>{{ $appointment->appointment_time }}</strong> болно.
                Цагтаа ирэхийг хүсэж байна!
            </div>
            <div class="notice notice-gray">
                ℹ️ Хэрэв ирж чадахгүй бол манай эмнэлэгтэй <strong>урьдчилан холбоо барьж</strong> цагаа өөрчлүүлнэ үү.
            </div>
        @else
            <div class="notice notice-yellow">
                ⏰ <strong>Сануулга:</strong> Таны үзүүлэх цаг <strong>удахгүй</strong>
                — өнөөдрийн <strong>{{ $appointment->appointment_time }}</strong> болно.
                Бэлэн байна уу!
            </div>
            <div class="notice notice-gray">
                ℹ️ Ирэхдээ захиалгын дугаараа <strong>#{{ $appointment->appointment_number }}</strong> дурдана уу.
            </div>
        @endif
    @else
        {{-- Онлайн уулзалтын сануулга --}}
        @if($appointment->meet_link)
            <div class="section-title">Онлайн уулзалт</div>
            <div class="meet-box">
                <div class="meet-label">🎥 Google Meet линк</div>
                <a href="{{ $appointment->meet_link }}" class="btn btn-blue">Meet орох</a>
                <div class="meet-url">{{ $appointment->meet_link }}</div>
            </div>
        @endif
        <div class="notice notice-yellow">
            ⚠️ <strong>Сануулга:</strong> Та {{ $type === '24h' ? 'маргааш' : 'удахгүй' }} онлайн зөвлөгөөтэй байна.
            Ирэхгүй тохиолдолд манай эмнэлэгтэй урьдчилан холбоо барина уу.
        </div>
    @endif
@endsection
