{{--
    Ажилтны сургалтын хувийн хэрэг — А4 босоо.

    mPDF нь flex/grid дэмждэггүй тул бүх байрлуулалт хүснэгтээр хийгдсэн.
    Өнгө нь бага — хэвлэсэн хар цагаан хуудсанд ч уншигдах ёстой, тиймээс
    төлөвийг зөвхөн өнгөөр биш, үргэлж бичгээр ч давхар хэлнэ.
--}}
@php
    $emp    = $data['employee'];
    $t      = $data['totals'];
    $bar    = fn (int $p) => max(0, min(100, $p));
@endphp
<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: dejavusans; font-size: 9pt; color: #1f2937; }

        .title { font-size: 15pt; font-weight: bold; letter-spacing: -0.3pt; }
        .sub   { font-size: 8pt; color: #6b7280; margin-top: 2pt; }

        .rule { border-bottom: 1.2pt solid #4c1d95; margin: 6pt 0 10pt; }

        h2 {
            font-size: 8.5pt; font-weight: bold; color: #4c1d95;
            text-transform: uppercase; letter-spacing: .8pt;
            margin: 14pt 0 5pt; padding-bottom: 3pt;
            border-bottom: .6pt solid #e5e7eb;
        }

        table { width: 100%; border-collapse: collapse; }

        .kv td { padding: 3.5pt 6pt; border: .5pt solid #e5e7eb; font-size: 8.5pt; }
        .kv td.k { background: #f9fafb; color: #6b7280; width: 16%; }
        .kv td.v { font-weight: bold; width: 34%; }

        .stats td {
            border: .5pt solid #e5e7eb; padding: 6pt 5pt;
            text-align: center; width: 20%;
        }
        .stats .n { font-size: 14pt; font-weight: bold; color: #4c1d95; }
        .stats .l { font-size: 7pt; color: #6b7280; margin-top: 2pt; }

        .grid { font-size: 8pt; }
        .grid th {
            background: #f3f4f6; color: #4b5563; font-size: 7.5pt;
            text-transform: uppercase; letter-spacing: .4pt;
            padding: 4pt 6pt; text-align: left; border: .5pt solid #e5e7eb;
        }
        .grid td { padding: 4pt 6pt; border: .5pt solid #e5e7eb; }
        .grid .r { text-align: right; }
        .grid .c { text-align: center; }
        .muted { color: #9ca3af; }

        .course-head td {
            background: #f5f3ff; font-weight: bold; font-size: 8.5pt;
            padding: 5pt 6pt; border: .5pt solid #ddd6fe;
        }

        /* Явцын шугам — mPDF дээр найдвартай ажилладаг хоёр давхар div */
        .track { background: #e5e7eb; height: 4pt; width: 100%; }
        .fill  { background: #7c3aed; height: 4pt; }
        .fill-ok { background: #059669; }

        .ok   { color: #047857; font-weight: bold; }
        .bad  { color: #b91c1c; font-weight: bold; }
        .warn { color: #b45309; font-weight: bold; }

        .note {
            background: #fffbeb; border: .5pt solid #fde68a;
            padding: 6pt 8pt; font-size: 8pt; color: #92400e;
        }
        .empty { color: #9ca3af; font-size: 8pt; padding: 8pt 0; }
    </style>
</head>
<body>

{{-- ── Толгой ───────────────────────────────────────────────────────── --}}
<table>
    <tr>
        <td>
            <div class="title">Сургалтын хувийн хэрэг</div>
            <div class="sub">Cuticul Dental — дотоод мэргэжлийн сургалт</div>
        </td>
        <td style="text-align: right; font-size: 8pt; color: #6b7280;">
            Хэвлэсэн: {{ $printedAt }}
        </td>
    </tr>
</table>
<div class="rule"></div>

{{-- ── Ажилтны мэдээлэл ─────────────────────────────────────────────── --}}
<table class="kv">
    <tr>
        <td class="k">Ажилтан</td>
        <td class="v">{{ $emp['name'] }}</td>
        <td class="k">Албан тушаал</td>
        <td class="v">{{ $emp['position'] ?? '—' }}</td>
    </tr>
    <tr>
        <td class="k">Салбар</td>
        <td class="v">{{ $emp['branch'] ?? '—' }}</td>
        <td class="k">Ажилтны дугаар</td>
        <td class="v">{{ $emp['number'] ?? '—' }}</td>
    </tr>
    <tr>
        <td class="k">Ажилд орсон</td>
        <td class="v">{{ $emp['hired_at'] ?? '—' }}</td>
        <td class="k">Сүүлд суралцсан</td>
        <td class="v">{{ $t['last_active_at'] ?? '—' }}</td>
    </tr>
</table>

{{-- ── Хураангуй үзүүлэлт ───────────────────────────────────────────── --}}
<h2>Нэгдсэн үзүүлэлт</h2>
<table class="stats">
    <tr>
        <td>
            <div class="n">{{ $t['percent'] }}%</div>
            <div class="l">Ерөнхий явц</div>
        </td>
        <td>
            <div class="n">{{ $t['lessons_done'] }}/{{ $t['lessons'] }}</div>
            <div class="l">Дуусгасан хичээл</div>
        </td>
        <td>
            <div class="n">{{ $t['courses_done'] }}/{{ $t['courses'] }}</div>
            <div class="l">Дуусгасан сургалт</div>
        </td>
        <td>
            <div class="n">{{ $t['exams_passed'] }}/{{ $t['exams_taken'] }}</div>
            <div class="l">Тэнцсэн шалгалт</div>
        </td>
        <td>
            <div class="n">{{ $t['watch_hours'] }}</div>
            <div class="l">Нийт цаг</div>
        </td>
    </tr>
</table>

@if ($t['late'] > 0)
    <div class="note" style="margin-top: 8pt;">
        Хугацаа хэтэрсэн, дуусгаагүй заавал үзэх хичээл: <b>{{ $t['late'] }}</b>
    </div>
@endif

{{-- ── Сургалт тус бүрийн явц ───────────────────────────────────────── --}}
<h2>Сургалтын явц</h2>
@if (empty($data['courses']))
    <div class="empty">Энэ ажилтны албан тушаалд нээлттэй сургалт алга байна.</div>
@else
    @foreach ($data['courses'] as $course)
        <table class="grid" style="margin-bottom: 8pt;">
            <tr class="course-head">
                <td colspan="2">
                    {{ $course['title'] }}
                    @if ($course['category'])
                        <span class="muted" style="font-weight: normal;"> · {{ $course['category'] }}</span>
                    @endif
                </td>
                <td class="c" style="background:#f5f3ff; border-color:#ddd6fe; width: 15%;">
                    {{ $course['completed'] }}/{{ $course['total'] }} хичээл
                </td>
                <td class="c" style="background:#f5f3ff; border-color:#ddd6fe; width: 12%;">
                    <b>{{ $course['percent'] }}%</b>
                </td>
                <td style="background:#f5f3ff; border-color:#ddd6fe; width: 18%;">
                    <div class="track">
                        <div class="fill {{ $course['percent'] >= 100 ? 'fill-ok' : '' }}"
                             style="width: {{ $bar($course['percent']) }}%;"></div>
                    </div>
                </td>
            </tr>

            <tr>
                <th style="width: 40%;">Хичээл</th>
                <th class="c" style="width: 12%;">Үргэлжлэх</th>
                <th class="c" style="width: 15%;">Явц</th>
                <th class="c" style="width: 12%;">Төлөв</th>
                <th class="c" style="width: 21%;">Дуусгасан</th>
            </tr>

            @foreach ($course['lessons'] as $lesson)
                <tr>
                    <td>
                        {{ $lesson['title'] }}
                        @if ($lesson['is_required'])
                            <span class="warn" style="font-size: 7pt;"> · заавал</span>
                        @endif
                    </td>
                    <td class="c muted">{{ $lesson['duration_label'] }}</td>
                    <td class="c">{{ $lesson['progress'] }}%</td>
                    <td class="c">
                        @if ($lesson['completed'])
                            <span class="ok">Дуусгасан</span>
                        @elseif ($lesson['is_late'])
                            <span class="bad">Хоцорсон</span>
                        @elseif ($lesson['views_count'] > 0)
                            <span class="warn">Үзэж байгаа</span>
                        @else
                            <span class="muted">Эхлээгүй</span>
                        @endif
                    </td>
                    <td class="c muted">{{ $lesson['completed_at'] ?? '—' }}</td>
                </tr>
            @endforeach
        </table>
    @endforeach
@endif

{{-- ── Шалгалтын дүн ────────────────────────────────────────────────── --}}
<h2>Шалгалтын дүн</h2>
@if (empty($data['exams']))
    <div class="empty">Хараахан шалгалт өгөөгүй байна.</div>
@else
    <table class="grid">
        <tr>
            <th style="width: 40%;">Шалгалт</th>
            <th class="c" style="width: 12%;">Оролдлого</th>
            <th class="c" style="width: 14%;">Шилдэг дүн</th>
            <th class="c" style="width: 12%;">Тэнцэх</th>
            <th class="c" style="width: 11%;">Төлөв</th>
            <th class="c" style="width: 11%;">Огноо</th>
        </tr>
        @foreach ($data['exams'] as $exam)
            <tr>
                <td>{{ $exam['title'] }}</td>
                <td class="c muted">{{ $exam['attempts'] }}</td>
                <td class="c"><b>{{ $exam['best_percent'] }}%</b>
                    <span class="muted">({{ $exam['best_score'] }}/{{ $exam['max_score'] }})</span>
                </td>
                <td class="c muted">{{ $exam['pass_percent'] }}%</td>
                <td class="c">
                    @if ($exam['is_passed'])
                        <span class="ok">Тэнцсэн</span>
                    @elseif ($exam['pending'])
                        <span class="warn">Үнэлэгдэж буй</span>
                    @else
                        <span class="bad">Тэнцээгүй</span>
                    @endif
                </td>
                <td class="c muted">{{ $exam['last_at'] ?? '—' }}</td>
            </tr>
        @endforeach
    </table>
@endif

{{-- ── Хугацаа хэтэрсэн ─────────────────────────────────────────────── --}}
@if (! empty($data['overdue']))
    <h2>Хугацаа хэтэрсэн заавал үзэх хичээл</h2>
    <table class="grid">
        <tr>
            <th style="width: 42%;">Хичээл</th>
            <th style="width: 26%;">Сургалт</th>
            <th class="c" style="width: 12%;">Хугацаа</th>
            <th class="c" style="width: 10%;">Хоцорсон</th>
            <th class="c" style="width: 10%;">Явц</th>
        </tr>
        @foreach ($data['overdue'] as $row)
            <tr>
                <td>{{ $row['title'] }}</td>
                <td class="muted">{{ $row['course_title'] }}</td>
                <td class="c muted">{{ $row['due_at'] }}</td>
                <td class="c bad">{{ $row['days_late'] }} хоног</td>
                <td class="c">{{ $row['progress'] }}%</td>
            </tr>
        @endforeach
    </table>
@endif

{{-- ── Ололтын түүх ─────────────────────────────────────────────────── --}}
@if (! empty($data['timeline']))
    <h2>Ололтын түүх (сүүлийн {{ count($data['timeline']) }})</h2>
    <table class="grid">
        <tr>
            <th style="width: 17%;">Огноо</th>
            <th style="width: 13%;">Төрөл</th>
            <th style="width: 40%;">Нэр</th>
            <th style="width: 20%;">Хамаарал</th>
            <th class="c" style="width: 10%;">Дүн</th>
        </tr>
        @foreach ($data['timeline'] as $e)
            <tr>
                <td class="muted">{{ $e['at'] }}</td>
                <td>{{ $e['kind'] === 'exam' ? 'Шалгалт' : 'Хичээл' }}</td>
                <td>{{ $e['title'] }}</td>
                <td class="muted">{{ $e['subtitle'] }}</td>
                <td class="c {{ $e['ok'] ? 'ok' : 'bad' }}">{{ $e['detail'] }}</td>
            </tr>
        @endforeach
    </table>
@endif

</body>
</html>
