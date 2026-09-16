@extends('emails.layouts.base')

@section('title', 'Шинэ видео хичээл нэмэгдлээ')

@section('header')
<div class="header header-indigo">
    <div class="header-icon">🎬</div>
    <h1>Шинэ видео хичээл</h1>
    <p><strong>{{ $lesson->title }}</strong></p>
</div>
@endsection

@section('content')
    @if($lesson->description)
        <div class="section-title">Тайлбар</div>
        <div class="info-grid">
            <div class="info-item full">
                <div class="ivalue">{{ $lesson->description }}</div>
            </div>
        </div>
    @endif

    <div class="section-title">Хичээлийн мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item full">
            <div class="ilabel">Хичээл</div>
            <div class="ivalue">{{ $lesson->title }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Сургалт</div>
            <div class="ivalue">{{ $lesson->course?->title ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Үргэлжлэх хугацаа</div>
            <div class="ivalue">{{ $lesson->duration_label ?: '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Заавал үзэх эсэх</div>
            <div class="ivalue">{{ $lesson->is_required ? 'Тийм' : 'Үгүй' }}</div>
        </div>
        @if($lesson->due_at)
        <div class="info-item">
            <div class="ilabel">Дуусгах хугацаа</div>
            <div class="ivalue">{{ $lesson->due_at->format('Y-m-d') }}</div>
        </div>
        @endif
    </div>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/my/training/lessons/{{ $lesson->id }}" class="btn btn-indigo">
            Хичээл үзэх →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — Лабораторийн сургалт')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Хичээлийг зөвхөн лабын ажилтан үзнэ.')
