{{--
    Гэрээ / ажлын байрны тодорхойлолтын PDF (mPDF).

    Хэвлэмэл гэрээний жишгээр: A5 босоо хуудас, Arial, нэг багана. 1-р хуудсанд
    байгууллагын толгой (лого + нэр), дараагийн хуудсуудад жижиг толгой.
    Хуудас бүрийн хөлд талуудын гарын үсгийн жижиг хувь (параф) болон
    хуудасны дугаар гарна. Төгсгөлд гарын үсгийн хүснэгт, цахим
    баталгаажуулалтын тэмдэглэл. Хуудасны хэмжээ, зах, фонтыг
    EmployeeDocumentPdf-ээс тохируулна — A5 дээр гаргаад A4 хэвтээ дээр 2-оор байрлуулна.
--}}
@php
    $vars = $doc->variables ?? [];
    $company = $vars['company_name'] ?? '“Кутикул” ХХК';
    $number = $doc->doc_number ?: ($vars['doc_number'] ?? null);
    $docRef = $doc->title.($number ? ' № '.$number : '');
@endphp
<style>
    body {
        font-family: arial;
        font-size: 9pt;
        line-height: 1.4;
        color: #111;
    }

    /* ── Байгууллагын толгой (1-р хуудас) ── */
    table.letterhead td { border: none; vertical-align: middle; padding: 0; }
    .lh-name { font-size: 10.5pt; font-weight: bold; letter-spacing: 0.5pt; color: #111; }
    .lh-sub { font-size: 6.5pt; color: #555; letter-spacing: 1pt; }
    .lh-rule { border-top: 1.2pt solid #111; height: 1px; margin-top: 4px; }
    .lh-rule-thin { border-top: 0.4pt solid #111; height: 1px; margin-top: 1.5pt; }

    /* ── Гарчиг ── */
    .doc-title {
        text-align: center;
        font-size: 12pt;
        font-weight: bold;
        letter-spacing: 1.2pt;
        margin: 12px 0 10px;
    }

    /* ── Агуулга ── */
    p { margin: 0 0 4px; text-align: justify; }
    h1, h2 {
        font-size: 9pt;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        margin: 9px 0 5px;
    }
    h3 { font-size: 9pt; font-weight: bold; margin: 7px 0 4px; }
    ul, ol { margin: 0 0 4px 14px; }
    li { margin-bottom: 2px; text-align: justify; }
    hr { border: none; border-top: 0.5pt solid #999; margin: 10px 0; }

    /* Дугаарлагдсан заалт — дугаар нь мөрнөөс гарсан догол */
    p.cl { margin-left: 24px; text-indent: -24px; margin-bottom: 3px; }
    p.ctr { text-align: center; }

    /* ── Хүснэгт ── */
    table { border-collapse: collapse; margin-bottom: 8px; }
    table td, table th { border: 0.5pt solid #555; padding: 3px 5px; font-size: 8pt; vertical-align: top; }
    table th { font-weight: bold; background-color: #f2f2f2; }
    /* Хүрээгүй байрлуулах хүснэгт — огноо/дугаар/хот, талуудын мэдээлэл */
    table.plain { width: 100%; }
    table.plain td, table.plain th { border: none; padding: 0 6px 4px 0; font-size: 9pt; background: none; }
    table.plain td strong { white-space: nowrap; }

    /* ── Гарын үсгийн хэсэг ── */
    .sign-heading {
        font-size: 9pt;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        margin: 14px 0 6px;
    }
    table.sign { width: 100%; border-collapse: collapse; }
    table.sign td { border: 0.5pt solid #333; padding: 4px 6px; font-size: 8.5pt; vertical-align: top; }
    table.sign td.head {
        background-color: #f2f2f2;
        font-weight: bold;
        text-align: center;
        letter-spacing: 0.6pt;
        font-size: 8pt;
    }
    .lbl { color: #555; font-size: 6.5pt; }
    .val { font-weight: bold; }
    .sig-box { height: 58px; }
    .sig-name { font-weight: bold; }
    .ts { font-size: 7pt; color: #444; text-align: center; }

    /* ── Цахим баталгаажуулалт ── */
    .verify {
        margin-top: 10px;
        border: 0.5pt solid #999;
        background-color: #fafafa;
        padding: 5px 7px;
        font-size: 6.5pt;
        color: #444;
        line-height: 1.4;
    }
    .verify b { color: #111; }

    /* ── Хуудасны толгой / хөл ── */
    table.run-head { margin: 0; }
    table.run-head td { border: none; border-bottom: 0.5pt solid #999; font-size: 6.5pt; color: #666; padding: 0 0 2px; }
    table.run-foot { margin: 0; }
    table.run-foot td { border: none; border-top: 0.5pt solid #999; font-size: 6.5pt; color: #555; vertical-align: middle; padding: 3px 0 0; }
    .paraf-img { height: 16px; }
</style>

{{-- 2-р хуудаснаас эхлэх жижиг толгой --}}
<htmlpageheader name="running">
    <table class="run-head" width="100%">
        <tr>
            <td width="50%">{{ $company }}</td>
            <td width="50%" style="text-align:right">{{ $docRef }}</td>
        </tr>
    </table>
</htmlpageheader>

{{-- Хуудас бүрийн хөл — талуудын параф + хуудасны дугаар --}}
<htmlpagefooter name="footer">
    <table class="run-foot" width="100%">
        <tr>
            <td width="36%">
                Ажил олгогч:
                @if($doc->employer_signature)
                    <img class="paraf-img" src="{{ $doc->employer_signature }}" />
                @else
                    ____________
                @endif
            </td>
            <td width="36%">
                Ажилтан:
                @if($doc->employee_signature)
                    <img class="paraf-img" src="{{ $doc->employee_signature }}" />
                @else
                    ____________
                @endif
            </td>
            <td width="28%" style="text-align:right">Хуудас {PAGENO} / {nbpg}</td>
        </tr>
    </table>
</htmlpagefooter>

<sethtmlpagefooter name="footer" value="on" />
<sethtmlpageheader name="running" value="on" show-this-page="0" />

{{-- Байгууллагын толгой --}}
<table class="letterhead" width="100%">
    <tr>
        @if($logo)
            <td width="12mm"><img src="{{ $logo }}" style="height:11mm" /></td>
        @endif
        <td style="padding-left:3mm">
            <div class="lh-name">{{ $company }}</div>
            <div class="lh-sub">CUTICUL DENTAL CLINIC</div>
        </td>
        <td style="text-align:right;font-size:6.5pt;color:#555">
            @if($number)Баримтын дугаар: <b style="color:#111">{{ $number }}</b><br />@endif
            Системийн дугаар: #{{ $doc->id }}
        </td>
    </tr>
</table>
<div class="lh-rule"></div>
<div class="lh-rule-thin"></div>

<div class="doc-title">{{ mb_strtoupper($doc->title) }}</div>

{!! $doc->body !!}

{{-- Гарын үсгийн хэсэг тасрахгүй нэг хуудсанд --}}
<div style="page-break-inside:avoid">
    <div class="sign-heading">Гэрээ байгуулсан талууд</div>
    <table class="sign" autosize="1">
        <tr>
            <td class="head" width="50%">АЖИЛ ОЛГОГЧИЙГ ТӨЛӨӨЛЖ</td>
            <td class="head" width="50%">АЖИЛТАН</td>
        </tr>
        <tr>
            <td>
                <div class="lbl">Байгууллага</div>
                <div class="val">{{ $company }}</div>
            </td>
            <td>
                <div class="lbl">Овог, нэр</div>
                <div class="val">{{ $vars['employee_full_name'] ?? ($doc->employee_name ?: '—') }}</div>
                @if(! empty($vars['employee_register']))
                    <div class="lbl" style="margin-top:3px">Регистрийн дугаар: <span style="color:#111">{{ mb_strtoupper($vars['employee_register']) }}</span></div>
                @endif
            </td>
        </tr>
        <tr>
            <td>
                <div class="lbl">Албан тушаал</div>
                <div class="val">{{ $doc->employer_position ?: '—' }}</div>
            </td>
            <td>
                <div class="lbl">Албан тушаал</div>
                <div class="val">{{ $doc->employee_position ?: '—' }}</div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="lbl">Гарын үсэг, тамга</div>
                <div class="sig-box">
                    @if($doc->employer_signature)
                        <img src="{{ $doc->employer_signature }}" style="height:44px" />
                    @endif
                    @if($doc->employer_stamp)
                        <img src="{{ $doc->employer_stamp }}" style="width:62px;margin-left:-14px" />
                    @endif
                </div>
                <div class="sig-name">/{{ $doc->employer_name ?: '—' }}/</div>
            </td>
            <td>
                <div class="lbl">Гарын үсэг</div>
                <div class="sig-box">
                    @if($doc->employee_signature)
                        <img src="{{ $doc->employee_signature }}" style="height:44px" />
                    @endif
                </div>
                <div class="sig-name">/{{ $doc->employee_name ?: '—' }}/</div>
            </td>
        </tr>
        <tr>
            <td class="ts">Гарын үсэг зурсан: {{ $doc->employer_signed_at?->format('Y-m-d H:i') ?? '—' }}</td>
            <td class="ts">Гарын үсэг зурсан: {{ $doc->employee_signed_at?->format('Y-m-d H:i') ?? '—' }}</td>
        </tr>
    </table>

    <div class="verify">
        <b>Цахим баталгаажуулалт.</b> Энэхүү баримт нь Cuticul Dental HR системд цахимаар үүсгэгдэж,
        талуудын цахим гарын үсгээр баталгаажсан бөгөөд цаасан хувьтай адил хүчинтэй.
        Системийн дугаар: <b>#{{ $doc->id }}</b>
        @if($doc->completed_at) · Баталгаажсан: <b>{{ $doc->completed_at->format('Y-m-d H:i') }}</b>@endif
        · Хяналтын код: <b>{{ $checksum }}</b>
    </div>
</div>
