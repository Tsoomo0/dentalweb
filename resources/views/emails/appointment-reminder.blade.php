<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <title>Цаг захиалгын сануулга</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #1a1a1a; }
        .wrapper { max-width: 580px; margin: 0 auto; padding: 24px 16px; }
        .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 36px 32px; text-align: center; }
        .header h1 { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
        .header p { color: rgba(255,255,255,0.9); font-size: 14px; }
        .body { padding: 32px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .info-item { background: #f9fafb; border: 1px solid #f0f0f0; border-radius: 10px; padding: 14px; }
        .info-item .label { font-size: 11px; color: #9ca3af; margin-bottom: 4px; font-weight: 500; }
        .info-item .value { font-size: 14px; font-weight: 600; color: #111827; }
        .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #92400e; line-height: 1.6; margin-bottom: 24px; }
        .badge { display: inline-block; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 20px; padding: 6px 16px; font-size: 13px; font-weight: 700; margin-bottom: 8px; }
        .meet-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center; }
        .meet-link { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px; margin-bottom: 8px; }
        .footer { background: #f9fafb; border-top: 1px solid #f0f0f0; padding: 20px 32px; text-align: center; }
        .footer p { font-size: 12px; color: #9ca3af; line-height: 1.6; }
        .brand { font-size: 16px; font-weight: 800; color: #b91c1c; margin-bottom: 4px; }
        @media (max-width: 480px) { .info-grid { grid-template-columns: 1fr; } .body { padding: 24px 20px; } }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="card">
        <div class="header">
            <div style="font-size:40px;margin-bottom:12px;">⏰</div>
            <h1>Цагийн сануулга</h1>
            <div class="badge" style="background:rgba(255,255,255,0.25);color:#fff;border-color:rgba(255,255,255,0.4);">
                {{ $type === '24h' ? '24 цагийн' : '2 цагийн' }} дараа
            </div>
            <p>Захиалгын дугаар: <strong>{{ $appointment->appointment_number }}</strong></p>
        </div>

        <div class="body">
            <div class="section-title">Захиалгын дэлгэрэнгүй</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Үйлчлүүлэгч</div>
                    <div class="value">{{ $appointment->patient_name }}</div>
                </div>
                <div class="info-item">
                    <div class="label">Утас</div>
                    <div class="value">{{ $appointment->patient_phone }}</div>
                </div>
                <div class="info-item">
                    <div class="label">Эмч</div>
                    <div class="value">{{ $appointment->doctor?->name ?? '—' }}</div>
                </div>
                <div class="info-item">
                    <div class="label">Огноо</div>
                    <div class="value">{{ $appointment->appointment_date->format('Y.m.d') }}</div>
                </div>
                <div class="info-item">
                    <div class="label">Эхлэх цаг</div>
                    <div class="value">{{ $appointment->appointment_time }}</div>
                </div>
                <div class="info-item">
                    <div class="label">Дуусах цаг</div>
                    <div class="value">{{ $appointment->appointment_time_end ?? '—' }}</div>
                </div>
            </div>

            @if($appointment->meet_link)
            <div class="section-title">Google Meet линк</div>
            <div class="meet-box">
                <div style="font-size:12px;color:#2563eb;font-weight:600;margin-bottom:8px;">🎥 Онлайн уулзалтын линк</div>
                <a href="{{ $appointment->meet_link }}" class="meet-link">Meet орох</a>
                <br><span style="font-size:12px;color:#374151;word-break:break-all;">{{ $appointment->meet_link }}</span>
            </div>
            @endif

            <div class="notice">
                ⚠️ <strong>Анхааруулга:</strong> Та {{ $type === '24h' ? 'маргааш' : 'удахгүй' }} цаг захиалгатай байна.
                Хэрэв ирж чадахгүй бол манай эмнэлэгтэй урьдчилан холбоо барина уу.
            </div>
        </div>

        <div class="footer">
            <div class="brand">Cuticul Dental</div>
            <p>Энэ и-мэйл автоматаар илгээгдсэн болно.</p>
        </div>
    </div>
</div>
</body>
</html>
