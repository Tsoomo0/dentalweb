<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 — Хуудас олдсонгүй | Cuticul Dental</title>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f9fafb;
            color: #111827;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        .header {
            padding: 20px 32px;
            background: #fff;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .logo-dot {
            width: 10px; height: 10px;
            background: #dc2626;
            border-radius: 50%;
        }
        .logo-text {
            font-size: 20px;
            font-weight: 800;
            color: #111827;
            letter-spacing: -0.5px;
        }
        .logo-text span { color: #dc2626; }

        /* Main */
        .main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
        }

        /* 404 illustration */
        .number-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 32px;
        }
        .num {
            font-size: clamp(80px, 18vw, 140px);
            font-weight: 900;
            line-height: 1;
            color: #f3f4f6;
            letter-spacing: -4px;
            text-shadow: 0 2px 0 #e5e7eb;
        }
        .tooth-icon {
            width: clamp(60px, 14vw, 100px);
            height: clamp(60px, 14vw, 100px);
            background: linear-gradient(135deg, #fee2e2, #fca5a5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 24px rgba(220, 38, 38, 0.2);
            flex-shrink: 0;
        }
        .tooth-icon svg {
            width: clamp(30px, 7vw, 50px);
            height: clamp(30px, 7vw, 50px);
        }

        .title {
            font-size: clamp(20px, 4vw, 28px);
            font-weight: 800;
            color: #111827;
            margin-bottom: 12px;
        }
        .subtitle {
            font-size: clamp(14px, 2vw, 16px);
            color: #6b7280;
            max-width: 400px;
            line-height: 1.6;
            margin-bottom: 40px;
        }

        /* Buttons */
        .btn-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #dc2626;
            color: #fff;
            text-decoration: none;
            font-size: 14px;
            font-weight: 700;
            padding: 12px 24px;
            border-radius: 12px;
            transition: background 0.15s, transform 0.1s;
            box-shadow: 0 4px 14px rgba(220, 38, 38, 0.25);
        }
        .btn-primary:hover { background: #b91c1c; transform: translateY(-1px); }
        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #fff;
            color: #374151;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            transition: background 0.15s, transform 0.1s;
        }
        .btn-secondary:hover { background: #f9fafb; transform: translateY(-1px); }

        /* Quick links */
        .quick-links {
            margin-top: 56px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            max-width: 560px;
            width: 100%;
        }
        .quick-link {
            background: #fff;
            border: 1px solid #f0f0f0;
            border-radius: 14px;
            padding: 16px;
            text-decoration: none;
            color: #374151;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            transition: all 0.15s;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .quick-link:hover {
            border-color: #fca5a5;
            background: #fff5f5;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(220,38,38,0.1);
        }
        .quick-link .icon {
            font-size: 22px;
        }

        /* Footer */
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #f0f0f0;
            background: #fff;
        }
    </style>
</head>
<body>

    <header class="header">
        <div class="logo-dot"></div>
        <div class="logo-text">Cuticul <span>Dental</span></div>
    </header>

    <main class="main">
        <div class="number-wrap">
            <span class="num">4</span>
            <div class="tooth-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2C9 2 6 4 6 7c0 2 .5 3.5 1 5s1 4 1 6c0 1 .5 2 1.5 2H12h2.5c1 0 1.5-1 1.5-2 0-2 .5-4.5 1-6s1-3 1-5c0-3-3-5-6-5z"/>
                </svg>
            </div>
            <span class="num">4</span>
        </div>

        <h1 class="title">Хуудас олдсонгүй</h1>
        <p class="subtitle">
            Таны хайж буй хуудас устгагдсан, нэр нь өөрчлөгдсөн эсвэл байгаагүй байна.
        </p>

        <div class="btn-group">
            <a href="/" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Нүүр хуудас
            </a>
            <a href="javascript:history.back()" class="btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
                </svg>
                Буцах
            </a>
        </div>

        <div class="quick-links">
            <a href="/booking" class="quick-link">
                <span class="icon">📅</span>
                Цаг захиалах
            </a>
            <a href="/services" class="quick-link">
                <span class="icon">🦷</span>
                Үйлчилгээнүүд
            </a>
            <a href="/doctors" class="quick-link">
                <span class="icon">👨‍⚕️</span>
                Эмч нар
            </a>
            <a href="/contact" class="quick-link">
                <span class="icon">📞</span>
                Холбоо барих
            </a>
        </div>
    </main>

    <footer class="footer">
        © {{ date('Y') }} Cuticul Dental. Бүх эрх хуулиар хамгаалагдсан.
    </footer>

</body>
</html>
