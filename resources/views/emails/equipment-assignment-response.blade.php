@extends('emails.layouts.base')

@section('title', 'Тоног төхөөрөмжийн хариу')

@section('header')
@if($assignment->isAccepted())
<div class="header header-green">
    <div class="header-icon">✅</div>
    <h1>Тоног төхөөрөмж хүлээн авагдлаа</h1>
    <p>Ажилтан хүлээн авахаа баталгаажууллаа</p>
</div>
@else
<div class="header header-danger">
    <div class="header-icon">❌</div>
    <h1>Тоног төхөөрөмж татгалзлаа</h1>
    <p>Ажилтан хүлээж авахаас татгалзлаа</p>
</div>
@endif
@endsection

@section('content')
    <div class="section-title">Төхөөрөмжийн мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item full">
            <div class="ilabel">Төхөөрөмжийн нэр</div>
            <div class="ivalue">{{ $assignment->equipment->name }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Серийн дугаар</div>
            <div class="ivalue">{{ $assignment->equipment->serial_number ?: '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Ажилтан</div>
            <div class="ivalue">{{ $assignment->employee->full_name }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Алба / Хэлтэс</div>
            <div class="ivalue">{{ $assignment->employee->branch?->name ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Хариу өгсөн огноо</div>
            <div class="ivalue">{{ now()->format('Y-m-d H:i') }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Статус</div>
            <div class="ivalue">
                @if($assignment->isAccepted())
                    <span class="badge badge-success">Зөвшөөрсөн</span>
                @else
                    <span class="badge badge-danger">Татгалзсан</span>
                @endif
            </div>
        </div>
    </div>

    @if($assignment->isAccepted())
        <div class="notice notice-green">
            ✅ Ажилтан тоног төхөөрөмжийг хүлээн авахаа баталгаажууллаа.
            Актыг архивт хадгалана уу.
        </div>
    @endif

    @if($assignment->isRejected() && $assignment->rejection_reason)
        <div class="notice notice-red">
            <strong>Татгалзсан шалтгаан:</strong><br>
            {{ $assignment->rejection_reason }}
        </div>
    @endif

    <div class="btn-block">
        <a href="{{ config('app.url') }}/hr/equipment" class="btn btn-indigo">
            Тоног төхөөрөмжийн хэсэг →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно.')
