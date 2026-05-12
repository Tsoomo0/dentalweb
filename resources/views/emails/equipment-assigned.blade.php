@extends('emails.layouts.base')

@section('title', 'Тоног төхөөрөмж хүлээн авах хүсэлт')

@section('header')
<div class="header header-indigo">
    <div class="header-icon">📦</div>
    <h1>Тоног төхөөрөмж хүлээлгэн өгөх акт</h1>
    <p>Та хүлээн авах эсэхээ баталгаажуулна уу</p>
</div>
@endsection

@section('content')
    <div class="notice notice-blue">
        Сайн байна уу, <strong>{{ $assignment->employee->full_name }}</strong>!
        Танд дараах тоног төхөөрөмжийг хариуцуулан өгөх хүсэлт ирсэн байна.
        Системд нэвтрэн зөвшөөрөх эсвэл татгалзана уу.
    </div>

    <div class="section-title">Төхөөрөмжийн мэдээлэл</div>
    <table class="kv-table">
        <tr>
            <td class="kv-key">Төхөөрөмжийн нэр</td>
            <td class="kv-val">{{ $assignment->equipment->name }}</td>
        </tr>
        <tr>
            <td class="kv-key">Серийн дугаар</td>
            <td class="kv-val">{{ $assignment->equipment->serial_number ?: '—' }}</td>
        </tr>
        <tr>
            <td class="kv-key">Брэнд / Загвар</td>
            <td class="kv-val">{{ implode(' / ', array_filter([$assignment->equipment->brand ?? null, $assignment->equipment->model ?? null])) ?: '—' }}</td>
        </tr>
        <tr>
            <td class="kv-key">Төлөв байдал</td>
            <td class="kv-val">{{ $assignment->equipment->condition_label }}</td>
        </tr>
        <tr>
            <td class="kv-key">Хүлээн авах ажилтан</td>
            <td class="kv-val">{{ $assignment->employee->full_name }}</td>
        </tr>
        <tr>
            <td class="kv-key">Алба / Хэлтэс</td>
            <td class="kv-val">{{ $assignment->employee->branch?->name ?? '—' }}</td>
        </tr>
        <tr>
            <td class="kv-key">Албан тушаал</td>
            <td class="kv-val">{{ $assignment->employee->position?->name ?? '—' }}</td>
        </tr>
        <tr>
            <td class="kv-key">Огноо</td>
            <td class="kv-val">{{ $assignment->created_at->format('Y-m-d') }}</td>
        </tr>
    </table>

    <div class="section-title">Үүрэг хариуцлага</div>
    <ol class="duties-box">
        <li>Ажилтан нь төхөөрөмжийг зөвхөн ажлын зориулалтаар ашиглана.</li>
        <li>Ашиглалтын зааврын дагуу ажиллуулна.</li>
        <li>Эвдрэл гэмтэл гарвал нэн даруй удирдлагад мэдэгдэнэ.</li>
        <li>Хайхрамжгүйгээс үүдэн гэмтээсэн бол нөхөн төлөх үүрэгтэй.</li>
        <li>Ажлаас гарах / шилжих үед бүрэн бүтэн буцаан хүлээлгэн өгнө.</li>
    </ol>

    <div class="btn-block">
        <a href="{{ config('app.url') }}/my/equipment" class="btn btn-indigo">
            Системд нэвтрэн зөвшөөрөх →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — HR Систем')
@section('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно.')
