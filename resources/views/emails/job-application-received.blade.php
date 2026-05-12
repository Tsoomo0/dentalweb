@extends('emails.layouts.base')

@section('title', 'Шинэ ажлын анкет ирлээ')

@section('header')
<div class="header header-blue">
    <div class="header-icon">📋</div>
    <h1>Шинэ ажлын анкет ирлээ</h1>
    <p>{{ $submittedAt }} — Системд бүртгэгдлээ</p>
</div>
@endsection

@section('content')
    <div class="section-title">Анкет илгээгчийн мэдээлэл</div>
    <div class="info-grid">
        <div class="info-item full">
            <div class="ilabel">Нэр</div>
            <div class="ivalue" style="font-size:16px;">{{ $applicantName }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Утасны дугаар</div>
            <div class="ivalue">{{ $phone }}</div>
        </div>
        @if($email)
        <div class="info-item">
            <div class="ilabel">И-мэйл</div>
            <div class="ivalue">{{ $email }}</div>
        </div>
        @endif
        @if($position)
        <div class="info-item">
            <div class="ilabel">Хүссэн албан тушаал</div>
            <div class="ivalue">{{ $position }}</div>
        </div>
        @endif
        <div class="info-item">
            <div class="ilabel">Ирсэн огноо</div>
            <div class="ivalue">{{ $submittedAt }}</div>
        </div>
    </div>

    <div class="cta-box">
        <p>Анкетийг дэлгэрэнгүй үзэх болон статусыг шинэчлэхийн тулд Admin хэсэгт нэвтэрнэ үү.</p>
        <a href="{{ url('/admin/job-applications') }}" class="btn btn-blue">
            Анкет харах →
        </a>
    </div>

    <div class="notice notice-yellow">
        📌 <strong>Санамж:</strong> Анкетийн статусыг
        <strong>Хүлээгдэж буй → Хянасан → Сонгогдсон / Татгалзсан</strong>
        гэж дараалан шинэчилж явна уу.
    </div>
@endsection

@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Хариу бичих шаардлагагүй.')
