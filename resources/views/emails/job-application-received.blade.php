<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Шинэ ажлын анкет ирлээ</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #1a1a1a; }
        .wrapper { max-width: 580px; margin: 0 auto; padding: 24px 16px; }
        .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); padding: 36px 32px; text-align: center; }
        .header-icon { font-size: 40px; margin-bottom: 14px; line-height: 1; }
        .header h1 { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
        .header p { color: rgba(255,255,255,0.85); font-size: 14px; }
        .body { padding: 32px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .info-item { background: #f9fafb; border: 1px solid #f0f0f0; border-radius: 10px; padding: 14px; }
        .info-item .label { font-size: 11px; color: #9ca3af; margin-bottom: 4px; font-weight: 500; }
        .info-item .value { font-size: 14px; font-weight: 600; color: #111827; word-break: break-all; }
        .cta-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center; }
        .cta-box p { font-size: 13px; color: #1e40af; margin-bottom: 14px; font-weight: 500; }
        .cta-btn { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; }
        .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #92400e; line-height: 1.6; margin-bottom: 24px; }
        .footer { background: #f9fafb; border-top: 1px solid #f0f0f0; padding: 20px 32px; text-align: center; }
        .footer p { font-size: 12px; color: #9ca3af; line-height: 1.6; }
        .brand { font-size: 16px; font-weight: 800; color: #b91c1c; margin-bottom: 4px; }
        @media (max-width: 480px) {
            .info-grid { grid-template-columns: 1fr; }
            .body { padding: 24px 20px; }
        }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="card">

        <div class="header">
            <div class="header-icon">📋</div>
            <h1>Шинэ ажлын анкет ирлээ</h1>
            <p>{{ $submittedAt }} — Системд бүртгэгдлээ</p>
        </div>

        <div class="body">

            <div class="section-title">Анкет илгээгчийн мэдээлэл</div>
            <div class="info-grid">
                <div class="info-item" style="grid-column: span 2;">
                    <div class="label">Нэр</div>
                    <div class="value" style="font-size:16px;">{{ $applicantName }}</div>
                </div>
                <div class="info-item">
                    <div class="label">Утасны дугаар</div>
                    <div class="value">{{ $phone }}</div>
                </div>
                @if($email)
                <div class="info-item">
                    <div class="label">И-мэйл</div>
                    <div class="value">{{ $email }}</div>
                </div>
                @endif
                @if($position)
                <div class="info-item">
                    <div class="label">Хүссэн албан тушаал</div>
                    <div class="value">{{ $position }}</div>
                </div>
                @endif
                <div class="info-item">
                    <div class="label">Ирсэн огноо</div>
                    <div class="value">{{ $submittedAt }}</div>
                </div>
            </div>

            <div class="cta-box">
                <p>Анкетийг дэлгэрэнгүй үзэх болон статусыг шинэчлэхийн тулд Admin хэсэгт нэвтэрнэ үү.</p>
                <a href="{{ url('/admin/job-applications') }}" class="cta-btn">
                    Анкет харах →
                </a>
            </div>

            <div class="notice">
                📌 <strong>Санамж:</strong> Энэ мэдэгдэл автоматаар илгээгдсэн. Анкетийн статусыг <strong>Хүлээгдэж буй → Хянасан → Сонгогдсон / Татгалзсан</strong> гэж шинэчилж явна уу.
            </div>

        </div>

        <div class="footer">
            <div class="brand">Cuticul Dental</div>
            <p>Энэ и-мэйл автоматаар илгээгдсэн болно. Хариу бичих шаардлагагүй.</p>
        </div>
    </div>
</div>
</body>
</html>
