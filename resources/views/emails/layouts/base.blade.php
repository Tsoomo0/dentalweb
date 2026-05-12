<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('title', 'Мэдэгдэл') — Cuticul Dental</title>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f1f3f8;
            color: #111827;
            -webkit-font-smoothing: antialiased;
            line-height: 1.5;
        }
        .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px 48px; }
        .card { background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05), 0 6px 24px rgba(0,0,0,.07); }

        /* ── Header variants ── */
        .header { padding: 38px 32px; text-align: center; }
        .header-red    { background: linear-gradient(140deg, #9f1239 0%, #dc2626 100%); }
        .header-amber  { background: linear-gradient(140deg, #92400e 0%, #d97706 100%); }
        .header-blue   { background: linear-gradient(140deg, #1e3a8a 0%, #2563eb 100%); }
        .header-green  { background: linear-gradient(140deg, #14532d 0%, #16a34a 100%); }
        .header-danger { background: linear-gradient(140deg, #7f1d1d 0%, #ef4444 100%); }
        .header-cyan   { background: linear-gradient(140deg, #164e63 0%, #0891b2 100%); }
        .header-purple { background: linear-gradient(140deg, #4c1d95 0%, #7c3aed 100%); }
        .header-indigo { background: linear-gradient(140deg, #312e81 0%, #4f46e5 100%); }
        .header-teal   { background: linear-gradient(140deg, #134e4a 0%, #0d9488 100%); }

        .header-icon {
            width: 64px; height: 64px;
            background: rgba(255,255,255,.18);
            border: 2px solid rgba(255,255,255,.25);
            border-radius: 50%;
            margin: 0 auto 18px;
            display: flex; align-items: center; justify-content: center;
            font-size: 26px; line-height: 1; text-align: center;
        }
        .header h1 {
            color: #fff; font-size: 21px; font-weight: 700;
            margin-bottom: 7px; letter-spacing: -0.02em;
        }
        .header p { color: rgba(255,255,255,.82); font-size: 13.5px; }
        .header strong { color: rgba(255,255,255,.96); }

        /* ── Body ── */
        .body { padding: 32px; }

        /* ── Section title ── */
        .section-title {
            font-size: 10.5px; font-weight: 700; text-transform: uppercase;
            letter-spacing: .10em; color: #9ca3af;
            margin-bottom: 14px; padding-bottom: 9px;
            border-bottom: 1px solid #f3f4f6;
        }

        /* ── Info grid ── */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 26px; }
        .info-item { background: #f9fafb; border: 1px solid #eeeff2; border-radius: 10px; padding: 13px 15px; }
        .info-item.full { grid-column: span 2; }
        .info-item .ilabel { font-size: 11px; color: #9ca3af; margin-bottom: 3px; font-weight: 500; }
        .info-item .ivalue { font-size: 13.5px; font-weight: 600; color: #111827; line-height: 1.4; word-break: break-word; }

        /* ── Notice / alert boxes ── */
        .notice { border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.7; margin-bottom: 26px; }
        .notice-yellow { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .notice-blue   { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
        .notice-green  { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .notice-red    { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        .notice-gray   { background: #f9fafb; border: 1px solid #e5e7eb; color: #374151; }

        /* ── Status badge ── */
        .badge { display: inline-block; border-radius: 99px; padding: 4px 14px; font-size: 12px; font-weight: 700; }
        .badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-danger  { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

        /* ── Buttons ── */
        .btn { display: inline-block; color: #fff !important; text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 13px 30px; border-radius: 9px; letter-spacing: -0.01em; }
        .btn-block { display: block; text-align: center; margin-bottom: 26px; }
        .btn-red    { background: #dc2626; }
        .btn-blue   { background: #2563eb; }
        .btn-green  { background: #16a34a; }
        .btn-purple { background: #7c3aed; }
        .btn-cyan   { background: #0891b2; }
        .btn-indigo { background: #4f46e5; }
        .btn-teal   { background: #0d9488; }

        /* ── CTA box ── */
        .cta-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 22px 24px; margin-bottom: 26px; text-align: center; }
        .cta-box p { font-size: 13px; color: #1e40af; margin-bottom: 16px; font-weight: 500; }

        /* ── Meet box ── */
        .meet-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 22px 24px; margin-bottom: 26px; text-align: center; }
        .meet-label { font-size: 12px; color: #1d4ed8; font-weight: 700; margin-bottom: 12px; letter-spacing: .02em; }
        .meet-url { font-size: 11.5px; color: #6b7280; word-break: break-all; margin-top: 10px; }

        /* ── Amount card ── */
        .amount-card { border-radius: 12px; padding: 20px 24px; text-align: center; margin-bottom: 26px; }
        .amount-label { font-size: 10.5px; color: #6b7280; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; font-weight: 600; }
        .amount-value { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
        .amount-card-green  { background: #f0fdf4; border: 1px solid #bbf7d0; }
        .amount-card-green .amount-value  { color: #16a34a; }
        .amount-card-green2 { background: #ecfdf5; border: 1px solid #a7f3d0; }
        .amount-card-green2 .amount-value { color: #059669; }
        .amount-card-cyan   { background: #ecfeff; border: 1px solid #a5f3fc; }
        .amount-card-cyan .amount-value   { color: #0891b2; }
        .amount-card-purple { background: #f5f3ff; border: 1px solid #ddd6fe; }
        .amount-card-purple .amount-value { color: #7c3aed; }
        .amount-card-red    { background: #fef2f2; border: 1px solid #fecaca; }
        .amount-card-red .amount-value    { color: #dc2626; }

        /* ── Two-col amount row ── */
        .amount-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 26px; }

        /* ── Data table ── */
        .data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 26px; }
        .data-table th { background: #f9fafb; padding: 10px 14px; text-align: left; color: #6b7280; font-weight: 600; font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #e5e7eb; }
        .data-table th.right { text-align: right; }
        .data-table td { padding: 10px 14px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        .data-table td.right { text-align: right; font-weight: 600; color: #111827; }
        .data-table td.muted { text-align: right; color: #6b7280; }
        .data-table td.negative { text-align: right; font-weight: 600; color: #dc2626; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:nth-child(even) td { background: #fafafa; }

        /* ── KV table (key-value pairs) ── */
        .kv-table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 26px; }
        .kv-table td { padding: 10px 14px; border-bottom: 1px solid #f3f4f6; }
        .kv-table tr:last-child td { border-bottom: none; }
        .kv-table td.kv-key { font-weight: 600; color: #374151; background: #f9fafb; width: 48%; }
        .kv-table td.kv-val { color: #111827; }

        /* ── Duties list ── */
        .duties-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px 16px 36px; margin-bottom: 26px; }
        .duties-box li { font-size: 13px; color: #374151; line-height: 1.75; }

        /* ── Divider ── */
        .divider { height: 1px; background: #f3f4f6; margin: 0 0 26px; }

        /* ── Footer ── */
        .footer { background: #f9fafb; border-top: 1px solid #eef0f3; padding: 22px 32px; text-align: center; }
        .brand { font-size: 15px; font-weight: 800; color: #dc2626; margin-bottom: 6px; letter-spacing: -0.01em; }
        .footer p { font-size: 12px; color: #9ca3af; line-height: 1.75; }

        /* ── Pre-footer ── */
        .pre-footer { text-align: center; padding: 18px 0 0; }
        .pre-footer p { font-size: 11px; color: #c4c8d4; }

        @media (max-width: 500px) {
            .info-grid { grid-template-columns: 1fr; }
            .info-item.full { grid-column: span 1; }
            .amount-row { grid-template-columns: 1fr; }
            .body { padding: 24px 20px; }
            .header { padding: 30px 20px; }
            .footer { padding: 18px 20px; }
        }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="card">

        @yield('header')

        <div class="body">
            @yield('content')
        </div>

        <div class="footer">
            <div class="brand">@yield('footer-brand', 'Cuticul Dental')</div>
            <p>@yield('footer-text', 'Энэ и-мэйл автоматаар илгээгдсэн болно. Хариу бичих шаардлагагүй.')</p>
        </div>

    </div>
    <div class="pre-footer">
        <p>© {{ date('Y') }} Cuticul Dental Clinic · Бүх эрх хуулиар хамгаалагдсан.</p>
    </div>
</div>
</body>
</html>
