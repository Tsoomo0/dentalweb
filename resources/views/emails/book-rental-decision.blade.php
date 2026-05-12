@extends('emails.layouts.base')

@section('title', 'Номын түрээс — Шийдвэр')

@section('header')
@if($rental->status === 'approved')
<div class="header header-green">
    <div class="header-icon">✅</div>
    <h1>Номын түрээс зөвшөөрөгдлөө!</h1>
    <p><strong>{{ $rental->book->title }}</strong></p>
</div>
@else
<div class="header header-danger">
    <div class="header-icon">❌</div>
    <h1>Номын түрээс цуцлагдлаа</h1>
    <p><strong>{{ $rental->book->title }}</strong></p>
</div>
@endif
@endsection

@section('content')
    <div class="section-title">Номын мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item full">
            <div class="ilabel">Номын нэр</div>
            <div class="ivalue">{{ $rental->book->title }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Зохиолч</div>
            <div class="ivalue">{{ $rental->book->author ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Шийдвэр</div>
            <div class="ivalue">
                @if($rental->status === 'approved')
                    <span class="badge badge-success">Зөвшөөрсөн</span>
                @else
                    <span class="badge badge-danger">Цуцалсан</span>
                @endif
            </div>
        </div>
    </div>

    @if($rental->status === 'approved')
        <div class="notice notice-green">
            ✅ <strong>Баяр хүргэе!</strong> Таны номын түрээсийн хүсэлт зөвшөөрөгдлөө.
            Номыг авахдаа HR-тэй холбоо барина уу.
        </div>
    @endif

    @if($rental->status === 'rejected' && $rental->rejection_reason)
        <div class="notice notice-red">
            <strong>Цуцлах шалтгаан:</strong><br>
            {{ $rental->rejection_reason }}
        </div>
    @endif

    <div class="btn-block">
        <a href="{{ config('app.url') }}/my/book-rentals" class="btn btn-purple">
            Миний хүсэлтүүд →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — Номын сан')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
