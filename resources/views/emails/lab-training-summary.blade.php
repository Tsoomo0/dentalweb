@extends('emails.layouts.base')

@section('title', 'Сургалтын хураангуй')

@section('header')
<div class="header header-purple">
    <div class="header-icon">📚</div>
    <h1>Сургалтын хураангуй</h1>
    <p><strong>{{ $rangeLabel }}</strong></p>
</div>
@endsection

@section('content')
    {{-- ── Энэ хугацааны идэвх ───────────────────────────────────────── --}}
    <div class="section-title">Энэ хугацаанд</div>
    <div class="info-grid">
        <div class="info-item">
            <div class="ilabel">Суралцсан ажилтан</div>
            <div class="ivalue">{{ $digest['active_staff'] }} / {{ $digest['audience'] }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Дуусгасан хичээл</div>
            <div class="ivalue">{{ $digest['completions'] }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Өгсөн шалгалт</div>
            <div class="ivalue">{{ $digest['exams_taken'] }}</div>
        </div>
        <div class="info-item">
            <div class="ilabel">Тэнцсэн шалгалт</div>
            <div class="ivalue">{{ $digest['exams_passed'] }}</div>
        </div>
    </div>

    {{-- ── Ерөнхий байдал ────────────────────────────────────────────── --}}
    <div class="section-title">Нийт байдал</div>
    <table class="kv-table">
        <tr>
            <td class="kv-key">Ерөнхий дуусгалт</td>
            <td class="kv-val"><b>{{ $digest['completion_percent'] }}%</b>
                <span style="color:#9ca3af">— үзэх ёстой хичээлүүдийн хэдэн хувь биелсэн</span>
            </td>
        </tr>
        <tr>
            <td class="kv-key">Нийтлэгдсэн хичээл</td>
            <td class="kv-val">{{ $digest['lessons'] }}
                <span style="color:#9ca3af">({{ $digest['required'] }} заавал үзэх)</span>
            </td>
        </tr>
        <tr>
            <td class="kv-key">Хугацаа хэтэрсэн</td>
            <td class="kv-val">
                @if ($digest['overdue_total'] > 0)
                    <b style="color:#dc2626">{{ $digest['overdue_total'] }}</b>
                    <span style="color:#9ca3af">хичээл-ажилтны хос</span>
                @else
                    <span style="color:#16a34a">Хоцрогдолгүй</span>
                @endif
            </td>
        </tr>
    </table>

    {{-- ── Хоцорч буй ажилтнууд ──────────────────────────────────────── --}}
    @if (! empty($digest['laggards']))
        <div class="section-title">Хугацаа хэтрүүлсэн ажилтнууд</div>
        <table class="data-table">
            <tr>
                <th>Ажилтан</th>
                <th>Албан тушаал</th>
                <th class="right">Хоцорсон</th>
                <th class="right">Явц</th>
            </tr>
            @foreach ($digest['laggards'] as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ $row['position'] ?? '—' }}</td>
                    <td class="negative">{{ $row['overdue'] }}</td>
                    <td class="muted">{{ $row['percent'] }}%</td>
                </tr>
            @endforeach
        </table>
    @endif

    {{-- ── Огт эхлээгүй ажилтнууд ────────────────────────────────────── --}}
    @if (! empty($digest['idle_staff']))
        <div class="section-title">Сургалтад огт ороогүй ажилтнууд</div>
        <table class="data-table">
            <tr>
                <th>Ажилтан</th>
                <th>Албан тушаал</th>
            </tr>
            @foreach ($digest['idle_staff'] as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ $row['position'] ?? '—' }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    {{-- ── Хүрэхгүй байгаа хичээлүүд ─────────────────────────────────── --}}
    @if (! empty($digest['cold_lessons']))
        <div class="section-title">Хамрах хүрээндээ хүрэхгүй байгаа хичээл</div>
        <table class="data-table">
            <tr>
                <th>Хичээл</th>
                <th>Сургалт</th>
                <th class="right">Үзсэн</th>
            </tr>
            @foreach ($digest['cold_lessons'] as $row)
                <tr>
                    <td>{{ $row['title'] }}</td>
                    <td>{{ $row['course'] ?? '—' }}</td>
                    <td class="right">{{ $row['reach'] }}/{{ $row['audience'] }}
                        <span style="color:#9ca3af">({{ $row['percent'] }}%)</span>
                    </td>
                </tr>
            @endforeach
        </table>
    @endif

    <div class="btn-block">
        <a href="{{ config('app.url') }}/admin/lab-training/report" class="btn btn-purple">
            Дэлгэрэнгүй тайлан →
        </a>
    </div>
@endsection

@section('footer-brand', 'Cuticul Dental — Дотоод сургалт')
@section('footer-text', 'Энэ хураангуй долоо хоног бүр автоматаар илгээгддэг.')
