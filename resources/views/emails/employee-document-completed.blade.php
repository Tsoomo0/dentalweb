@extends('emails.layouts.base')

@section('title', $doc->title)

@section('header')
<div class="header header-green">
    <div class="header-icon">📄</div>
    <h1>Гэрээ баталгаажлаа</h1>
    <p><strong>{{ $doc->title }}</strong></p>
</div>
@endsection

@section('content')
    <div class="notice notice-green">
        @if($isEmployer)
            <strong>{{ $doc->employee_name }}</strong> «{{ $doc->title }}»-д гарын үсэг зурснаар
            баримт хоёр талын гарын үсгээр баталгаажлаа. Хувийг хавсаргав.
        @else
            Сайн байна уу, <strong>{{ $doc->employee_name }}</strong>!
            Таны «{{ $doc->title }}» хоёр талын гарын үсгээр баталгаажлаа.
            Хувийг энэхүү захидалд PDF хэлбэрээр хавсаргав.
        @endif
    </div>

    <div class="section-title">Баримтын мэдээлэл</div>
    <table class="kv-table">
        <tr>
            <td class="kv-key">Баримтын төрөл</td>
            <td class="kv-val">{{ $doc->type_label }}</td>
        </tr>
        @if($doc->doc_number)
        <tr>
            <td class="kv-key">Дугаар</td>
            <td class="kv-val">{{ $doc->doc_number }}</td>
        </tr>
        @endif
        <tr>
            <td class="kv-key">Ажилтан</td>
            <td class="kv-val">{{ $doc->employee_name }}{{ $doc->employee_position ? ' — '.$doc->employee_position : '' }}</td>
        </tr>
        <tr>
            <td class="kv-key">Ажил олгогч</td>
            <td class="kv-val">{{ $doc->employer_position }} {{ $doc->employer_name }}</td>
        </tr>
        @if($doc->employer_signed_at)
        <tr>
            <td class="kv-key">Ажил олгогч гарын үсэг зурсан</td>
            <td class="kv-val">{{ $doc->employer_signed_at->format('Y-m-d H:i') }}</td>
        </tr>
        @endif
        @if($doc->employee_signed_at)
        <tr>
            <td class="kv-key">Ажилтан гарын үсэг зурсан</td>
            <td class="kv-val">{{ $doc->employee_signed_at->format('Y-m-d H:i') }}</td>
        </tr>
        @endif
        @if($doc->effective_date)
        <tr>
            <td class="kv-key">Хүчин төгөлдөр болох</td>
            <td class="kv-val">{{ $doc->effective_date->format('Y-m-d') }}</td>
        </tr>
        @endif
        @if($doc->expires_at)
        <tr>
            <td class="kv-key">Дуусах хугацаа</td>
            <td class="kv-val">{{ $doc->expires_at->format('Y-m-d') }}</td>
        </tr>
        @endif
    </table>

    <div class="btn-block">
        <a href="{{ config('app.url') }}{{ $isEmployer ? '/hr/employee-documents' : '/my/contracts' }}" class="btn btn-green">
            Системээс харах →
        </a>
    </div>

    <div class="notice notice-gray">
        Хавсаргасан PDF нь хоёр талын гарын үсэг бүхий албан ёсны хувь болно.
        Асуулт гарвал хүний нөөцийн ажилтантай холбогдоно уу.
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — Хүний нөөц')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Хариу бичих шаардлагагүй.')
