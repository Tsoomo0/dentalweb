<!DOCTYPE html>
<html lang="mn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Засвар үйлчилгээ | Cuticul Dental</title>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f9fafb; color: #111827;
            min-height: 100vh; display: flex; flex-direction: column;
        }
        .header { padding: 20px 32px; background: #fff; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 10px; }
        .logo-dot { width: 10px; height: 10px; background: #dc2626; border-radius: 50%; }
        .logo-text { font-size: 20px; font-weight: 800; color: #111827; }
        .logo-text span { color: #dc2626; }
        .main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; }
        .icon { width: 96px; height: 96px; background: linear-gradient(135deg, #fee2e2, #fca5a5); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; box-shadow: 0 8px 24px rgba(220,38,38,0.2); }
        .icon svg { width: 48px; height: 48px; }
        h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
        p { font-size: 16px; color: #6b7280; max-width: 400px; line-height: 1.6; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f0f0f0; background: #fff; }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo-dot"></div>
        <div class="logo-text">Cuticul <span>Dental</span></div>
    </header>
    <main class="main">
        <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C9 2 6 4 6 7c0 2 .5 3.5 1 5s1 4 1 6c0 1 .5 2 1.5 2H12h2.5c1 0 1.5-1 1.5-2 0-2 .5-4.5 1-6s1-3 1-5c0-3-3-5-6-5z"/>
            </svg>
        </div>
        <h1>Засвар үйлчилгээ хийгдэж байна</h1>
        <p>Манай вэбсайт одоогоор засвар үйлчилгээний горимд байна. Удахгүй буцаж ирнэ. Баярлалаа!</p>
    </main>
    <footer class="footer">© {{ date('Y') }} Cuticul Dental. Бүх эрх хуулиар хамгаалагдсан.</footer>
</body>
</html>
