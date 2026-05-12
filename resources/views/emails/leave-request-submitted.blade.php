@extends('emails.layouts.base')

@section('title', 'Чөлөөний хүсэлт ирлээ')

@section('header')
<div class="header header-blue">
    <div class="header-icon">📋</div>
    <h1>Чөлөөний хүсэлт ирлээ</h1>
    <p><strong>{{ $leaveRequest->employee->full_name }}</strong> чөлөө хүслээ</p>
</div>
@endsection

@section('content')
    <div class="section-title">Ажилтны мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Овог нэр</div>
            <div class="ivalue">{{ $leaveRequest->employee->full_name }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Ажилтны дугаар</div>
            <div class="ivalue">{{ $leaveRequest->employee->employee_number }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Албан тушаал</div>
            <div class="ivalue">{{ $leaveRequest->employee->position?->name ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Салбар</div>
            <div class="ivalue">{{ $leaveRequest->employee->branch?->name ?? '—' }}</div>
        </div>
    </div>

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
            <div class="ilabel">Орлох ажилтан</div>
            <div class="ivalue">{{ $leaveRequest->replacement?->full_name ?? 'Заагаагүй' }}</div>
        </div>
    </div>

    <div class="section-title">Хүсэлтийн шалтгаан</div>
    <div class="notice notice-gray">
        📝 {{ $leaveRequest->reason }}
    </div>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/hr/leave-requests/{{ $leaveRequest->id }}" class="btn btn-blue">
            Хүсэлтийг харах →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
