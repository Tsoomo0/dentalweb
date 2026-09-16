@extends('emails.layouts.base')

@section('title', 'Шинэ шалгалт нээгдлээ')

@section('header')
<div class="header header-purple">
    <div class="header-icon">📝</div>
    <h1>Шинэ шалгалт нээгдлээ</h1>
    <p><strong>{{ $exam->title }}</strong></p>
</div>
@endsection

@section('content')
    @if($exam->description)
        <div class="section-title">Тайлбар</div>
        <div class="info-grid">
            <div class="info-item full">
                <div class="ivalue">{{ $exam->description }}</div>
            </div>
        </div>
    @endif

    <div class="section-title">Шалгалтын мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item full">
            <div class="ilabel">Шалгалт</div>
            <div class="ivalue">{{ $exam->title }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Сургалт</div>
            <div class="ivalue">{{ $exam->course?->title ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Хичээл</div>
            <div class="ivalue">{{ $exam->lesson?->title ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Асуултын тоо</div>
            <div class="ivalue">{{ $exam->questions()->count() }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Хугацаа</div>
            <div class="ivalue">{{ $exam->duration_minutes ? $exam->duration_minutes.' минут' : 'Хязгааргүй' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Тэнцэх босго</div>
            <div class="ivalue">{{ $exam->pass_percent }}%</div>
        </div>
        @if($exam->opens_at)
        <div class="info-item">
            <div class="ilabel">Нээгдэх</div>
            <div class="ivalue">{{ $exam->opens_at->format('Y-m-d H:i') }}</div>
        </div>
        @endif
        @if($exam->closes_at)
        <div class="info-item">
            <div class="ilabel">Хаагдах</div>
            <div class="ivalue">{{ $exam->closes_at->format('Y-m-d H:i') }}</div>
        </div>
        @endif
    </div>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/my/training/exams/{{ $exam->id }}" class="btn btn-purple">
            Шалгалт руу орох →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — Лабораторийн сургалт')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Шалгалтыг зөвхөн лабын ажилтан өгнө.')
