@extends('emails.layouts.base')

@section('title', 'Номын түрээсийн хүсэлт ирлээ')

@section('header')
<div class="header header-purple">
    <div class="header-icon">📚</div>
    <h1>Номын түрээсийн хүсэлт ирлээ</h1>
    <p><strong>{{ $rental->employee->full_name }}</strong> ном түрээслэхийг хүслээ</p>
</div>
@endsection

@section('content')
    <div class="section-title">Ажилтны мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Овог нэр</div>
            <div class="ivalue">{{ $rental->employee->full_name }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Ажилтны дугаар</div>
            <div class="ivalue">{{ $rental->employee->employee_number }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Албан тушаал</div>
            <div class="ivalue">{{ $rental->employee->position?->name ?? '—' }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Салбар</div>
            <div class="ivalue">{{ $rental->employee->branch?->name ?? '—' }}</div>
        </div>
    </div>

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
            <div class="ilabel">Ангилал</div>
            <div class="ivalue">{{ $rental->book->category?->name ?? '—' }}</div>
        </div>
        @if($rental->book->isbn)
        <div class="info-item">
            <div class="ilabel">ISBN</div>
            <div class="ivalue">{{ $rental->book->isbn }}</div>
        </div>
        @endif
    </div>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/hr/book-rentals" class="btn btn-purple">
            Хүсэлтийг харах →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — Номын сан')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Асуулт байвал HR-тэй холбоо барина уу.')
