@extends('emails.layouts.base')

@section('title', $isOverdue ? 'Сургалтын хугацаа хэтэрлээ' : 'Сургалтын хугацаа дуусах гэж байна')

@section('header')
<div class="header {{ $isOverdue ? 'header-danger' : 'header-amber' }}">
    <div class="header-icon">{{ $isOverdue ? '⚠️' : '⏳' }}</div>
    <h1>{{ $isOverdue ? 'Хугацаа хэтэрсэн байна' : 'Хугацаа дуусах гэж байна' }}</h1>
    <p><strong>{{ $lesson->title }}</strong></p>
</div>
@endsection

@section('content')
    <div class="notice {{ $isOverdue ? 'notice-red' : 'notice-yellow' }}">
        @if ($isOverdue)
            Энэ хичээлийг <b>{{ $lesson->due_at?->format('Y-m-d') }}</b> гэхэд үзэж дуусгах ёстой байсан
            бөгөөд <b>{{ $days }} хоног</b> хэтэрсэн байна. Аль болох хурдан үзэж дуусгана уу —
            гүйцэтгэл нь удирдлагын тайланд тусгагдана.
        @else
            Энэ хичээлийг үзэж дуусгах хугацаа <b>{{ $days }} хоногийн дараа</b>
            ({{ $lesson->due_at?->format('Y-m-d') }}) дуусна.
        @endif
    </div>

    <div class="section-title">Хичээлийн мэдээлэл</div>
    <table class="kv-table">
        <tr>
            <td class="kv-key">Хичээл</td>
            <td class="kv-val">{{ $lesson->title }}</td>
        </tr>
        <tr>
            <td class="kv-key">Сургалт</td>
            <td class="kv-val">{{ $lesson->course?->title ?? '—' }}</td>
        </tr>
        <tr>
            <td class="kv-key">Үргэлжлэх хугацаа</td>
            <td class="kv-val">{{ $lesson->duration_label ?: '—' }}</td>
        </tr>
        <tr>
            <td class="kv-key">Дуусгах эцсийн хугацаа</td>
            <td class="kv-val">{{ $lesson->due_at?->format('Y-m-d') ?? '—' }}</td>
        </tr>
    </table>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/my/training/lessons/{{ $lesson->id }}"
           class="btn {{ $isOverdue ? 'btn-red' : 'btn-indigo' }}">
            Одоо үзэх →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — Дотоод сургалт')
@section('footer-text', 'Хичээлийг үзэж дуусгасны дараа энэ сануулга автоматаар зогсоно.')
