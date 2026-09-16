{{--
    Гэрээ / ажлын байрны тодорхойлолтын PDF (mPDF).

    A4 хэвтээ дээр агуулга 2 багана болж урсана — нэг хуудсанд хоёр
    "хуудас" зэрэгцэн харагдана. Гарын үсгийн блок нь төгсгөлд бүтэн
    өргөнөөр гарна. Хуудасны хэмжээ, зах, хөлийг EmployeeDocumentPdf-ээс
    тохируулна.
--}}
<style>
    body {
        font-family: dejavusans, sans-serif;
        font-size: 10pt;
        line-height: 1.3;
        color: #000;
    }

    /* ── Гарчиг ── */
    .doc-title {
        text-align: center;
        font-size: 11pt;
        font-weight: bold;
        margin-bottom: 8px;
    }

    /* ── Агуулга ── */
    p { margin: 0 0 4px; text-align: justify; }
    h1, h2 { font-size: 10.5pt; font-weight: bold; text-align: center; margin: 9px 0 5px; }
    h3 { font-size: 10.5pt; font-weight: bold; margin: 8px 0 4px; }
    ul { margin: 0 0 5px 16px; }
    ol { margin: 0 0 5px 16px; }
    li { margin-bottom: 2px; text-align: justify; }
    hr { border: none; border-top: 1px solid #999; margin: 8px 0; }

    /* Дугаарлагдсан заалт — дугаар нь мөрнөөс гарсан догол */
    p.cl { margin-left: 26px; text-indent: -26px; margin-bottom: 2px; }
    p.ctr { text-align: center; }

    /* ── Хүснэгт ── */
    table { border-collapse: collapse; margin-bottom: 6px; }
    table td, table th { border: 1px solid #666; padding: 3px 5px; font-size: 9pt; vertical-align: top; }
    table th { font-weight: bold; }
    /* Хүрээгүй байрлуулах хүснэгт — толгой хэсэг, талуудын мэдээлэл */
    table.plain td, table.plain th { border: none; padding: 0 6px 3px 0; font-size: 10pt; }
    table.plain td strong { white-space: nowrap; }

    /* ── Гарын үсгийн блок (бүтэн өргөнөөр) ── */
    .sign-heading { font-weight: bold; font-size: 10.5pt; margin: 6px 0 8px; }
    .sign-table td { border: none; padding: 0 12px 0 0; vertical-align: top; }
    .sign-role { font-weight: bold; font-size: 10pt; }
    .sign-sub { font-size: 9.5pt; margin-bottom: 3px; }
    /* Гарын үсгийн зураасыг нэрийн дээд хүрээгээр гаргана — mPDF дээр
       хоосон блокийн border харагддаггүй. */
    .sign-name { font-weight: bold; font-size: 10pt; width: 82%; border-top: 1px solid #000; padding-top: 3px; }
    .sign-date { font-size: 8pt; color: #555; }

    .verify { border-top: 1px solid #bbb; padding-top: 4px; font-size: 7.5pt; color: #666; }
</style>

<div class="doc-title">{{ mb_strtoupper($doc->title) }}</div>

{{-- Эндээс агуулга 2 багана болж урсана --}}
<columns column-count="2" vAlign="J" column-gap="7" />

{!! $doc->body !!}

{{-- Багана дуусаж, гарын үсгийн хэсэг бүтэн өргөнөөр --}}
<columns column-count="1" />

<div class="sign-heading">ГЭРЭЭ БАЙГУУЛСАН:</div>
<table class="sign-table" style="width:100%">
    <tr>
        <td style="width:50%">
            <div class="sign-role">Ажил олгогчийг төлөөлж:</div>
            <div class="sign-sub">{{ $doc->employer_position ?: '—' }}</div>
            <div style="height:64px">
                @if($doc->employer_signature)
                    <img src="{{ $doc->employer_signature }}" style="height:50px" />
                @endif
                @if($doc->employer_stamp)
                    <img src="{{ $doc->employer_stamp }}" style="width:80px;margin-left:-14px" />
                @endif
            </div>
            <div class="sign-name">{{ $doc->employer_name ?: '—' }}</div>
            @if($doc->employer_signed_at)
                <div class="sign-date">{{ $doc->employer_signed_at->format('Y-m-d H:i') }}</div>
            @endif
        </td>
        <td style="width:50%">
            <div class="sign-role">Ажилтан:</div>
            <div class="sign-sub">{{ $doc->employee_position ?: '—' }}</div>
            <div style="height:64px">
                @if($doc->employee_signature)
                    <img src="{{ $doc->employee_signature }}" style="height:50px" />
                @endif
            </div>
            <div class="sign-name">{{ $doc->employee_name ?: '—' }}</div>
            @if($doc->employee_signed_at)
                <div class="sign-date">{{ $doc->employee_signed_at->format('Y-m-d H:i') }}</div>
            @endif
        </td>
    </tr>
</table>

<div class="verify">
    Энэхүү баримт нь Cuticul Dental HR системд цахимаар үүсгэгдэж, хоёр талын цахим
    гарын үсгээр баталгаажсан болно. Баримтын дугаар: #{{ $doc->id }}@if($doc->completed_at) · Баталгаажсан: {{ $doc->completed_at->format('Y-m-d H:i') }}@endif
</div>
