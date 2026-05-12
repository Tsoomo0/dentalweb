@extends('emails.layouts.base')

@section('title', 'Ээлжийн амралтын хүсэлт ирлээ')

@section('header')
<div class="header header-blue">
    <div class="header-icon">🏖️</div>
    <h1>Ээлжийн амралтын хүсэлт ирлээ</h1>
    <p><strong>{{ $vacationRequest->employee->full_name }}</strong> амралт хүслээ</p>
</div>
@endsection

@section('content')
    <div class="section-title">Ажилтны мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Овог нэр</div>
            <div class="ivalue">{{ $vacationRequest->employee->full_name }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Ажилтны дугаар</div>
            <div class="ivalue">{{ $vacationRequest->employee->employee_number }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Албан тушаал</div>
            <div class="ivalue">{{ $vacationRequest->employee->position?->name ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Салбар</div>
            <div class="ivalue">{{ $vacationRequest->employee->branch?->name ?? '—' }}</div>
        </div>
    </div>

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
            <div class="ilabel">Статус</div>
            <div class="ivalue"><span class="badge badge-pending">Хүлээгдэж байна</span></div>
        </div>
        @if($vacationRequest->location_during_leave)
        <div class="info-item">
            <div class="ilabel">Байршил</div>
            <div class="ivalue">{{ $vacationRequest->location_during_leave }}</div>
        </div>
        @endif
        @if($vacationRequest->emergency_phone)
        <div class="info-item">
            <div class="ilabel">Яаралтай утас</div>
            <div class="ivalue">{{ $vacationRequest->emergency_phone }}</div>
        </div>
        @endif
    </div>

    <div class="section-title">Хүсэлтийн шалтгаан</div>
    <div class="notice notice-gray">
        📝 {{ $vacationRequest->reason }}
    </div>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/hr/vacation-requests" class="btn btn-blue">
            Хүсэлтийг харах →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
